/**
 * Generates a bundled index.d.ts from JSDoc-annotated JS source files.
 *
 * Usage: node utils/gen-dts.js <tsconfig-path>
 *
 * Steps:
 *   1. Parse tsconfig to find source files, rootDir, and output path
 *   2. Scan source files for @event ClassName#event-name annotations, grouped by class
 *   3. Delete stale .d.ts files from the module directory
 *   4. tsc emits per-file .d.ts into a temp directory
 *   5. Type alias imports are rewritten to avoid a rollup-plugin-dts bug with invalid identifiers
 *   6. rollup-plugin-dts bundles them into a single declaration file
 *   7. Transforms: strip underscore-prefixed members, inject typed event maps for any
 *      class with @event annotations
 */

import { execSync } from 'child_process';
import { existsSync, globSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, relative, resolve, sep } from 'path';
import { rollup } from 'rollup';
import dts from 'rollup-plugin-dts';

const ROOT = resolve( import.meta.dirname, '..' );

// Parse CLI argument
const tsconfigArg = process.argv[ 2 ];
if ( ! tsconfigArg ) {

	console.error( 'Usage: node utils/gen-dts.js <tsconfig-path>' );
	process.exit( 1 );

}

const tsconfigPath = resolve( ROOT, tsconfigArg );
const tsconfig = JSON.parse( readFileSync( tsconfigPath, 'utf8' ) );
const { include, compilerOptions: { rootDir = '.' } = {} } = tsconfig;

if ( ! include || ! include.length ) {

	console.error( `No "include" array found in ${ tsconfigPath }` );
	process.exit( 1 );

}

// Expand include entries to source files; treat each entry as a base directory
const resolvedFiles = include.flatMap( p => globSync( `${ resolve( ROOT, p ) }/**/*.js` ) );
const indexFiles = resolvedFiles.filter( f => f.endsWith( `${ sep }index.js` ) );
if ( ! indexFiles.length ) {

	console.error( `No index.js found under include paths` );
	process.exit( 1 );

}

const rootDirAbs = resolve( ROOT, rootDir );

// Step 1: scan all source files for @event ClassName#event-name annotations
const eventsByClass = parseEventsByClass( resolvedFiles );

// Step 2: delete stale .d.ts files from each module directory
for ( const indexFile of indexFiles ) {

	deleteDtsFiles( dirname( indexFile ) );

}

// Step 3: emit .d.ts for all files to a temp directory in one tsc pass
const tmpDir = mkdtempSync( join( tmpdir(), 'dts-' ) );
try {

	execSync(
		`npx tsc -p ${ tsconfigPath } --declarationDir ${ tmpDir }`,
		{ cwd: ROOT, stdio: 'inherit' },
	);

	// Fix any invalid namespace imports tsc emitted (e.g. `import * as 3d_...`)
	fixTypeAliasImportsInDir( tmpDir );

	// Step 4: rollup-bundle each index.js into its own index.d.ts
	for ( const indexFile of indexFiles ) {

		const outFile = join( dirname( indexFile ), 'index.d.ts' );
		const entryRel = relative( rootDirAbs, indexFile ).replace( /\.js$/, '.d.ts' );
		const entry = join( tmpDir, entryRel );

		const bundle = await rollup( {
			input: entry,
			plugins: [
				resolveDtsExtensions( tmpDir ),
				dts(),
				stripUnderscoreMembers(),
				injectEventMaps( eventsByClass ),
			],
			external: [ /^3d-tiles-renderer/ ],
		} );

		await bundle.write( { file: outFile, format: 'es' } );
		await bundle.close();
		console.log( `Written: ${ outFile }` );

	}

} finally {

	rmSync( tmpDir, { recursive: true, force: true } );

}

// --- Helpers ---


/**
 * Deletes all .d.ts files recursively under a directory.
 */
function deleteDtsFiles( dir ) {

	for ( const entry of readdirSync( dir, { withFileTypes: true } ) ) {

		const full = join( dir, entry.name );
		if ( entry.isDirectory() ) {

			deleteDtsFiles( full );

		} else if ( entry.name.endsWith( '.d.ts' ) ) {

			unlinkSync( full );

		}

	}

}

/**
 * Resolves .js imports inside the temp directory to their .d.ts counterparts.
 */
function resolveDtsExtensions( tmpDir ) {

	return {
		name: 'resolve-dts-extensions',
		resolveId( id, importer ) {

			if ( importer && importer.startsWith( tmpDir ) && id.endsWith( '.js' ) ) {

				const candidate = join( dirname( importer ), id.replace( /\.js$/, '.d.ts' ) );
				if ( existsSync( candidate ) ) return candidate;

			}

			return null;

		},
	};

}

/**
 * Walks a directory and rewrites .d.ts files, converting tsc's `export type X = import("pkg").X`
 * aliases to `import type { X } from "pkg"`. This avoids rollup-plugin-dts generating namespace
 * imports for packages whose names are invalid JS identifiers (e.g. '3d-tiles-renderer/core').
 */
function fixTypeAliasImportsInDir( dir ) {

	for ( const entry of readdirSync( dir, { withFileTypes: true } ) ) {

		const full = join( dir, entry.name );
		if ( entry.isDirectory() ) {

			fixTypeAliasImportsInDir( full );

		} else if ( entry.name.endsWith( '.d.ts' ) ) {

			const code = readFileSync( full, 'utf8' );
			const result = code.replace(
				/^export type (\w+) = import\(["']([^"']+)["']\)\.(\w+);$/gm,
				( _, local, pkg, exported ) => local === exported
					? `import type { ${ local } } from "${ pkg }";`
					: `import type { ${ exported } as ${ local } } from "${ pkg }";`,
			);
			if ( result !== code ) writeFileSync( full, result, 'utf8' );

		}

	}

}

/**
 * Rollup transform that removes underscore-prefixed class members from .d.ts output.
 * Handles single-line and multiline (inline object type) member declarations.
 */
function stripUnderscoreMembers() {

	return {
		name: 'strip-underscore-members',
		renderChunk( code ) {

			const lines = code.split( '\n' );
			const out = [];
			let skip = 0;

			for ( const line of lines ) {

				if ( skip > 0 ) {

					for ( const ch of line ) {

						if ( ch === '{' ) skip ++;
						else if ( ch === '}' ) skip --;

					}

					continue;

				}

				if ( /^\s+(private\s+)?_\w+[\s:(]/.test( line ) ) {

					for ( const ch of line ) {

						if ( ch === '{' ) skip ++;
						else if ( ch === '}' ) skip --;

					}

					continue;

				}

				out.push( line );

			}

			return { code: out.join( '\n' ), map: null };

		},
	};

}

/**
 * Scans a list of source files for JSDoc @event ClassName#event-name blocks,
 * grouped by class name. Returns a Map<className, { mapName, events[] }>.
 */
function parseEventsByClass( sourceFiles ) {

	const eventsByClass = new Map();

	for ( const filePath of sourceFiles ) {

		const source = readFileSync( filePath, 'utf8' );
		const blockRegex = /\/\*\*([\s\S]*?)\*\//g;
		let match;

		while ( ( match = blockRegex.exec( source ) ) !== null ) {

			const block = match[ 1 ];
			const eventMatch = block.match( /@event\s+(\w+)#([\w-]+)/ );
			if ( ! eventMatch ) continue;

			const className = eventMatch[ 1 ];
			const eventName = eventMatch[ 2 ];
			const deprecated = /@deprecated/.test( block );
			const props = [];
			const propRegex = /@property\s+\{([^}]+)\}\s+(\[?\w+\]?)/g;
			let propMatch;

			while ( ( propMatch = propRegex.exec( block ) ) !== null ) {

				const optional = propMatch[ 2 ].startsWith( '[' );
				const propName = propMatch[ 2 ].replace( /[[\]]/g, '' );
				props.push( { type: propMatch[ 1 ], name: propName, optional } );

			}

			if ( ! eventsByClass.has( className ) ) {

				eventsByClass.set( className, { mapName: `${ className }EventMap`, events: [] } );

			}

			eventsByClass.get( className ).events.push( { name: eventName, deprecated, props } );

		}

	}

	return eventsByClass;

}

/**
 * Maps JSDoc type names to TypeScript type names.
 */
function jsDocTypeToTs( type ) {

	return type.split( '|' ).map( t => {

		t = t.trim();
		return {
			Object: 'any',
			object: 'object',
			string: 'string',
			number: 'number',
			boolean: 'boolean',
			Error: 'Error',
			URL: 'URL',
			null: 'null',
		}[ t ] ?? t;

	} ).join( ' | ' );

}

/**
 * Builds a TypeScript interface string for an event map.
 * Properties named 'scene' of type Object/any are mapped to the TScene type parameter.
 */
function buildEventMapInterface( mapName, events ) {

	const lines = [ `interface ${ mapName }<TScene = unknown> {` ];

	for ( const event of events ) {

		if ( event.deprecated ) lines.push( `\t/** @deprecated */` );

		const propStr = event.props.map( p => {

			let type = jsDocTypeToTs( p.type );
			if ( p.name === 'scene' && type === 'any' ) type = 'TScene';
			return `${ p.name }${ p.optional ? '?' : '' }: ${ type }`;

		} ).join( '; ' );

		lines.push( `\t'${ event.name }': ${ propStr ? `{ ${ propStr } }` : '{}' };` );

	}

	lines.push( `}` );
	return lines.join( '\n' );

}

/**
 * Builds the typed event listener overload declarations for a class with a TEventMap type parameter.
 */
function buildEventListenerOverloads() {

	const T = `T extends keyof TEventMap`;
	const typedCallback = `callback: ( event: TEventMap[ T ] & { type: T } ) => void`;
	const anyCallback = `callback: ( event: any ) => void`;
	const typedEvent = `event: TEventMap[ T ] & { type: T }`;

	return [
		`\taddEventListener<${ T }>( name: T, ${ typedCallback } ): void;`,
		`\taddEventListener( name: string, ${ anyCallback } ): void;`,
		``,
		`\tremoveEventListener<${ T }>( name: T, ${ typedCallback } ): void;`,
		`\tremoveEventListener( name: string, ${ anyCallback } ): void;`,
		``,
		`\thasEventListener<${ T }>( name: T, ${ typedCallback } ): boolean;`,
		`\thasEventListener( name: string, ${ anyCallback } ): boolean;`,
		``,
		`\tdispatchEvent<${ T }>( ${ typedEvent } ): void;`,
		`\tdispatchEvent( event: { type: string } ): void;`,
	].join( '\n' );

}

/**
 * Removes declaration lines for the given method names from a block of code.
 * Handles both single-line and multi-line method signatures.
 */
function removeMethodDeclarations( code, methodNames ) {

	const lines = code.split( '\n' );
	const out = [];
	let inMethod = false;
	let parenDepth = 0;

	for ( const line of lines ) {

		if ( inMethod ) {

			for ( const ch of line ) {

				if ( ch === '(' ) parenDepth ++;
				else if ( ch === ')' ) parenDepth --;

			}

			if ( parenDepth <= 0 && line.trimEnd().endsWith( ';' ) ) {

				inMethod = false;
				parenDepth = 0;

			}

			continue;

		}

		const trimmed = line.trimStart();
		const isMethod = methodNames.some( name => trimmed.startsWith( `${ name }(` ) );

		if ( isMethod ) {

			inMethod = true;
			parenDepth = 0;

			for ( const ch of line ) {

				if ( ch === '(' ) parenDepth ++;
				else if ( ch === ')' ) parenDepth --;

			}

			if ( parenDepth <= 0 && line.trimEnd().endsWith( ';' ) ) {

				inMethod = false;
				parenDepth = 0;

			}

			continue;

		}

		out.push( line );

	}

	return out.join( '\n' );

}

/**
 * Within a class body starting at classStart, removes event listener method stubs
 * and appends typed event listener overloads.
 */
function replaceEventMethodsInClass( code, classStart ) {

	const openBrace = code.indexOf( '{', classStart );
	if ( openBrace === -1 ) return code;

	// Find the matching closing brace of the class
	let depth = 0;
	let classEnd = -1;
	for ( let i = openBrace; i < code.length; i ++ ) {

		const ch = code[ i ];
		if ( ch === '{' ) depth ++;
		else if ( ch === '}' ) {

			depth --;
			if ( depth === 0 ) {

				classEnd = i;
				break;

			}

		}

	}

	if ( classEnd === -1 ) return code;

	const before = code.slice( 0, openBrace + 1 );
	let body = code.slice( openBrace + 1, classEnd );
	const after = code.slice( classEnd );

	const eventListenerMethods = [
		'addEventListener',
		'removeEventListener',
		'hasEventListener',
		'dispatchEvent',
	];

	body = removeMethodDeclarations( body, eventListenerMethods );
	body = body.trimEnd() + '\n\n' + buildEventListenerOverloads() + '\n';

	return before + body + after;

}

/**
 * Rollup plugin that, for each class with @event annotations:
 *   1. Inserts a typed event map interface before the class declaration
 *   2. Makes the class generic: ClassName<TEventMap extends ClassNameEventMap = ClassNameEventMap>
 *   3. Replaces generic event listener stubs with typed overloads
 */
function injectEventMaps( eventsByClass ) {

	return {
		name: 'inject-event-maps',
		renderChunk( code ) {

			for ( const [ className, { mapName, events } ] of eventsByClass ) {

				const iface = buildEventMapInterface( mapName, events );

				// Find the class declaration
				const classPattern = new RegExp( `(?:export )?declare class ${ className }\\b` );
				const classMatch = classPattern.exec( code );
				if ( ! classMatch ) continue;

				// Find the start of the line containing the class declaration
				const lineStart = code.lastIndexOf( '\n', classMatch.index ) + 1;

				// Insert the event map interface before the class declaration line
				code = code.slice( 0, lineStart ) + iface + '\n\n' + code.slice( lineStart );

				// Make the class generic (re-search after insertion)
				code = code.replace(
					new RegExp( `((?:export )?declare class ${ className })\\b` ),
					`$1<TEventMap extends ${ mapName } = ${ mapName }>`,
				);

				// Replace event listener stubs with typed overloads in the class body
				const classBodyStart = code.search(
					new RegExp( `declare class ${ className }<TEventMap` ),
				);
				if ( classBodyStart !== - 1 ) {

					code = replaceEventMethodsInClass( code, classBodyStart );

				}

			}

			return { code, map: null };

		},
	};

}
