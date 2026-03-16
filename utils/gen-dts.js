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
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
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

	console.error( 'No index.js found under include paths' );
	process.exit( 1 );

}

const rootDirAbs = resolve( ROOT, rootDir );

// Step 1: scan all source files for @event and @typedef annotations
const eventsByClass = parseEventsByClass( resolvedFiles );
const typedefImports = parseTypedefImports( resolvedFiles );

// Step 2: emit .d.ts for all files to a temp directory in one tsc pass
const tmpDir = mkdtempSync( join( tmpdir(), 'dts-' ) );
try {

	execSync(
		`npx tsc -p ${ tsconfigPath } --declarationDir ${ tmpDir }`,
		{ cwd: ROOT, stdio: 'inherit' },
	);

	// Step 3: fix invalid tsc-emitted imports on disk before rollup reads them
	for ( const srcFile of resolvedFiles ) {

		const rel = relative( rootDirAbs, srcFile ).replace( /\.js$/, '.d.ts' );
		const tmpFile = join( tmpDir, rel );
		if ( ! existsSync( tmpFile ) ) continue;

		const original = readFileSync( tmpFile, 'utf8' );
		const fixed = fixTscEmittedImports( original );
		if ( fixed !== original ) writeFileSync( tmpFile, fixed );

	}

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
			external: id => ! id.startsWith( '.' ) && ! id.startsWith( '/' ),
		} );

		await bundle.write( { file: outFile, format: 'es' } );
		await bundle.close();

		// Uncomment any // @import lines left by fixTscEmittedImports, then inject
		// missing imports for @typedef {import('pkg').Type} Name annotations in sources
		let out = readFileSync( outFile, 'utf8' );
		out = out.replace( /^\/\/ @import /gm, 'import ' );
		out = injectTypedefImports( out, typedefImports );
		writeFileSync( outFile, out );

		console.log( `Written: ${ outFile }` );

	}

} finally {

	rmSync( tmpDir, { recursive: true, force: true } );

}

// --- Helpers ---

/**
 * Scans source files for @typedef {import('pkg').Export} LocalName annotations.
 * Returns an array of { pkg, exportedName, localName } objects.
 */
function parseTypedefImports( sourceFiles ) {

	const results = [];
	const seen = new Set();

	for ( const filePath of sourceFiles ) {

		const source = readFileSync( filePath, 'utf8' );
		for ( const [ , pkg, exportedName, localName ] of source.matchAll(
			/@typedef\s+\{import\(['"]([^'"]+)['"]\)\.(\w+)\}\s+(\w+)/g,
		) ) {

			const key = `${ pkg }:${ exportedName }:${ localName }`;
			if ( ! seen.has( key ) ) {

				seen.add( key );
				results.push( { pkg, exportedName, localName } );

			}

		}

	}

	return results;

}

/**
 * For each typedef import whose localName appears in the bundle but has no import,
 * prepends the appropriate import type statement.
 */
function injectTypedefImports( code, typedefImports ) {

	for ( const { pkg, exportedName, localName } of typedefImports ) {

		// Skip if already imported
		const alreadyImported = new RegExp( `from ['"]${ pkg.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }['"]` ).test( code );
		if ( alreadyImported ) continue;

		// Only inject if the localName is actually used in the bundle
		if ( ! new RegExp( `\\b${ localName }\\b` ).test( code ) ) continue;

		const importLine = exportedName === localName
			? `import type { ${ localName } } from '${ pkg }';`
			: `import type { ${ exportedName } as ${ localName } } from '${ pkg }';`;
		code = importLine + '\n' + code;

	}

	return code;

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
 * Fixes tsc emission patterns that cause rollup-plugin-dts to fail on packages whose names
 * are invalid JS identifiers (e.g. '3d-tiles-renderer/core'). Applied directly to .d.ts
 * files on disk before rollup reads them.
 *
 *   1. tsc re-export aliases: `export type X = import("pkg").X` → `// @import type { X } from "pkg"`
 *   2. tsc namespace imports with invalid identifiers: `import * as 3d_foo from "pkg"` →
 *      `// @import type { X, Y } from "pkg"` with inline references de-qualified
 *   3. inline import expressions: `import("pkg").TypeName` → `TypeName` with hoisted import added
 */
function fixTscEmittedImports( code ) {

	// Fix 1: re-export alias pattern
	code = code.replace(
		/^export type (\w+) = import\(["']([^"']+)["']\)\.(\w+);$/gm,
		( _, local, pkg, exported ) => local === exported
			? `// @import type { ${ local } } from "${ pkg }";`
			: `// @import type { ${ exported } as ${ local } } from "${ pkg }";`,
	);

	// Fix 2: namespace imports whose alias starts with a digit (invalid identifier)
	for ( const [ fullMatch, alias, pkg ] of code.matchAll( /^import \* as (\d\w*) from "([^"]+)";$/gm ) ) {

		const usedNames = [ ...new Set(
			[ ...code.matchAll( new RegExp( `\\b${ alias }\\.(\\w+)`, 'g' ) ) ].map( m => m[ 1 ] ),
		) ];
		code = code.replace( fullMatch, `// @import type { ${ usedNames.join( ', ' ) } } from "${ pkg }";` );
		code = code.replace( new RegExp( `\\b${ alias }\\.(\\w+)`, 'g' ), '$1' );

	}

	// Fix 3: inline import("pkg").TypeName expressions — hoist to import statements
	const byPkg = new Map();
	for ( const [ , pkg, name ] of code.matchAll( /import\(["']([^"']+)["']\)\.(\w+)/g ) ) {

		if ( ! byPkg.has( pkg ) ) byPkg.set( pkg, new Set() );
		byPkg.get( pkg ).add( name );

	}

	for ( const [ pkg, names ] of byPkg ) {

		const importLine = `// @import type { ${ [ ...names ].join( ', ' ) } } from "${ pkg }";`;
		code = importLine + '\n' + code;
		code = code.replace( new RegExp( `import\\(["']${ pkg.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }["']\\)\\.(\\w+)`, 'g' ), '$1' );

	}

	return code;

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

			let result = out.join( '\n' );

			// Strip untyped event listener stubs — they shadow typed overloads from the base class
			result = result.replace( /^[ \t]*(addEventListener|removeEventListener|hasEventListener|dispatchEvent)\([^)]*\bany\b[^)]*\):.*;\n/gm, '' );

			return { code: result, map: null };

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

	const lines = [ `export interface ${ mapName }<TScene = unknown> {` ];

	for ( const event of events ) {

		if ( event.deprecated ) lines.push( '\t/** @deprecated */' );

		const propStr = event.props.map( p => {

			let type = jsDocTypeToTs( p.type );
			if ( p.name === 'scene' && type === 'any' ) type = 'TScene';
			return `${ p.name }${ p.optional ? '?' : '' }: ${ type }`;

		} ).join( '; ' );

		lines.push( `\t'${ event.name }': ${ propStr ? `{ ${ propStr } }` : '{}' };` );

	}

	lines.push( '}' );
	return lines.join( '\n' );

}

/**
 * Builds the typed event listener overload declarations for a class with a TEventMap type parameter.
 */
function buildEventListenerOverloads() {

	const T = 'T extends keyof TEventMap';
	const typedCallback = 'callback: ( event: TEventMap[ T ] & { type: T } ) => void';
	const anyCallback = 'callback: ( event: any ) => void';
	const typedEvent = 'event: TEventMap[ T ] & { type: T }';

	return [
		`\taddEventListener<${ T }>( name: T, ${ typedCallback } ): void;`,
		`\taddEventListener( name: string, ${ anyCallback } ): void;`,
		'',
		`\tremoveEventListener<${ T }>( name: T, ${ typedCallback } ): void;`,
		`\tremoveEventListener( name: string, ${ anyCallback } ): void;`,
		'',
		`\thasEventListener<${ T }>( name: T, ${ typedCallback } ): boolean;`,
		`\thasEventListener( name: string, ${ anyCallback } ): boolean;`,
		'',
		`\tdispatchEvent<${ T }>( ${ typedEvent } ): void;`,
		'\tdispatchEvent( event: { type: string } ): void;',
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
	if ( openBrace === - 1 ) return code;

	// Find the matching closing brace of the class
	let depth = 0;
	let classEnd = - 1;
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

	if ( classEnd === - 1 ) return code;

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
