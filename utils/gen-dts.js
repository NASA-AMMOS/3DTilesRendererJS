/**
 * Generates src/core/plugins/index.d.ts from JSDoc-annotated JS source.
 *
 * Steps:
 *   1. Delete stale .d.ts files so tsc generates fresh declarations
 *   2. tsc emits per-file .d.ts into a temp directory
 *   3. rollup-plugin-dts bundles them into a single declaration file
 *   4. A transform strips any underscore-prefixed members from the output
 */

import { execSync } from 'child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { rollup } from 'rollup';
import dts from 'rollup-plugin-dts';

const ROOT = resolve( import.meta.dirname, '..' );
const PLUGINS_DIR = join( ROOT, 'src/core/plugins' );
const OUT_FILE = join( PLUGINS_DIR, 'index.d.ts' );

// Step 1: delete stale .d.ts files (recursively) so tsc generates fresh ones
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

deleteDtsFiles( PLUGINS_DIR );

// Step 2: emit .d.ts to a temp directory
const tmpDir = mkdtempSync( join( tmpdir(), 'dts-' ) );
try {

	execSync(
		`npx tsc -p tsconfig.core-plugins.json --declarationDir ${ tmpDir }`,
		{ cwd: ROOT, stdio: 'inherit' },
	);

	// Step 3+4: bundle with rollup-dts and strip _ members
	const entry = join( tmpDir, 'core/plugins/index.d.ts' );

	const bundle = await rollup( {
		input: entry,
		plugins: [
			resolveDtsExtensions( tmpDir ),
			dts(),
			stripUnderscoreMembers(),
		],
		external: [ /^3d-tiles-renderer/ ],
	} );

	await bundle.write( {
		file: OUT_FILE,
		format: 'es',
	} );

	await bundle.close();
	console.log( `Written: ${ OUT_FILE }` );

} finally {

	rmSync( tmpDir, { recursive: true, force: true } );

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
 * Rollup transform that removes underscore-prefixed class members from .d.ts output.
 * Handles single-line and multiline (inline object type) member declarations.
 */
function stripUnderscoreMembers() {

	return {
		name: 'strip-underscore-members',
		renderChunk( code ) {

			// Match underscore-prefixed member declarations, including multiline ones
			// where the type spans multiple lines (e.g. _foo: {\n    bar: any;\n};)
			// Strategy: track brace depth after matching a _ member opener.
			const lines = code.split( '\n' );
			const out = [];
			let skip = 0; // brace depth while skipping a multiline member

			for ( const line of lines ) {

				if ( skip > 0 ) {

					// count braces to know when the member body ends
					for ( const ch of line ) {

						if ( ch === '{' ) skip ++;
						else if ( ch === '}' ) skip --;

					}

					continue;

				}

				if ( /^\s+(private\s+)?_\w+[\s:(]/.test( line ) ) {

					// count any opening braces on this line to detect multiline type
					for ( const ch of line ) {

						if ( ch === '{' ) skip ++;
						else if ( ch === '}' ) skip --;

					}

					// if skip > 0 the body continues on subsequent lines; either way skip this line
					continue;

				}

				out.push( line );

			}

			return { code: out.join( '\n' ), map: null };

		},
	};

}
