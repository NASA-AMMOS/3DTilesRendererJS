// Bundles each of the cases below on its own and reports the minified and gzipped size, so the
// impact of a change on what a consumer actually downloads is visible. Run from the repo root.
//
//     node ./scripts/bundle-size.js                          print the sizes
//     node ./scripts/bundle-size.js sizes.json               write the sizes as json
//     node ./scripts/bundle-size.js --report a.json b.json   print the markdown comparison

import { gzipSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { build } from 'vite';
import { packageAliases } from '../vite.config.js';

// peer dependencies are provided by the consumer, so they are not part of the download
const EXTERNAL = [
	'three',
	'react',
	'react-dom',
	'@react-three/fiber',
	'@babylonjs/core',
	'@babylonjs/loaders',
];

// each case is bundled from these exports, mirroring how a consumer would import the library
const CASES = [
	{
		name: 'Core',
		exports: [ 'export { TilesRendererBase } from "3d-tiles-renderer/core";' ],
	},
	{
		name: 'three.js',
		exports: [ 'export { TilesRenderer } from "3d-tiles-renderer/three";' ],
	},
	{
		name: 'three.js + fade',
		exports: [
			'export { TilesRenderer } from "3d-tiles-renderer/three";',
			'export { TilesFadePlugin } from "3d-tiles-renderer/three/plugins";',
		],
	},
	{
		name: 'Babylon.js',
		exports: [ 'export { TilesRenderer } from "3d-tiles-renderer/babylonjs";' ],
	},
];

const ENTRY_ID = 'virtual:bundle-size-entry';

function virtualEntry( code ) {

	return {
		name: 'bundle-size-entry',
		resolveId( id ) {

			return id === ENTRY_ID ? `\0${ ENTRY_ID }` : null;

		},
		load( id ) {

			return id === `\0${ ENTRY_ID }` ? code : null;

		},
	};

}

function isExternal( id ) {

	return EXTERNAL.some( name => id === name || id.startsWith( `${ name }/` ) );

}

async function measure( code ) {

	const result = await build( {
		configFile: false,
		logLevel: 'silent',
		resolve: {
			alias: packageAliases,
		},
		plugins: [ virtualEntry( code ) ],
		build: {
			write: false,
			minify: true,
			rollupOptions: {
				input: ENTRY_ID,
				external: isExternal,
				// vite defaults this to false for app builds, which would drop the exports and
				// tree shake the whole bundle away
				preserveEntrySignatures: 'strict',
				output: {
					format: 'es',
				},
			},
		},
	} );

	const [ output ] = Array.isArray( result ) ? result : [ result ];
	const bundle = output.output
		.filter( chunk => chunk.type === 'chunk' )
		.map( chunk => chunk.code )
		.join( '' );

	return {
		size: Buffer.byteLength( bundle ),
		gzip: gzipSync( bundle ).length,
	};

}

function formatBytes( bytes, showSign = false ) {

	const sign = showSign && bytes >= 0 ? '+' : bytes < 0 ? '-' : '';

	return `${ sign }${ ( Math.abs( bytes ) / 1000 ).toFixed( 2 ) } kB`;

}

function report( basePath, prPath ) {

	const base = JSON.parse( readFileSync( basePath, 'utf8' ) ).sizes;
	const pr = JSON.parse( readFileSync( prPath, 'utf8' ) ).sizes;

	const rows = pr.map( after => {

		// matched by name so that adding a case does not shift the rows out of alignment
		const before = base.find( entry => entry.name === after.name );
		const cells = [
			after.name,
			before ? `${ formatBytes( before.size ) } <br> **${ formatBytes( before.gzip ) }**` : '–',
			`${ formatBytes( after.size ) } <br> **${ formatBytes( after.gzip ) }**`,
			before ? `${ formatBytes( after.size - before.size, true ) } <br> **${ formatBytes( after.gzip - before.gzip, true ) }**` : '–',
		];

		return `| ${ cells.join( ' | ' ) } |`;

	} );

	return `### 📦 Bundle size

_Each case bundled on its own and minified, with gzipped size in bold. Peer dependencies are excluded._

|| Before | After | Diff |
|:-:|:-:|:-:|:-:|
${ rows.join( '\n' ) }`;

}

const [ command, ...args ] = process.argv.slice( 2 );

if ( command === '--report' ) {

	console.log( report( args[ 0 ], args[ 1 ] ) );

} else {

	const results = [];
	for ( const { name, exports } of CASES ) {

		results.push( { name, ...await measure( exports.join( '\n' ) ) } );

	}

	if ( command ) {

		// the pull request number is stored alongside the sizes so the workflow that comments can
		// find the pull request without checking out its code
		const pr = args[ 0 ] ? Number( args[ 0 ] ) : null;
		writeFileSync( command, JSON.stringify( { pr, sizes: results } ) );

	} else {

		results.forEach( ( { name, size, gzip } ) => {

			console.log( `${ name }: ${ formatBytes( size ) }, ${ formatBytes( gzip ) } gzipped` );

		} );

	}

}
