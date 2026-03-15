import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { renderClass, renderTypedef, renderConstants } from './RenderDocsUtils.js';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const rootDir = path.resolve( __dirname, '../..' );

// Entry point definitions — directories (or individual files) to scan and where to write output.
// JSDoc will process all .js files found in each listed directory.
const ENTRY_POINTS = [
	{
		output: 'src/three/plugins/API_TEST.md',
		title: '3d-tiles-renderer/three/plugins',
		sources: [
			'src/three/plugins/images/sources/WMTSImageSource.js',
		],
	},
	{
		output: 'src/core/renderer/API_TEST.md',
		title: '3d-tiles-renderer/core',
		sources: [
			'src/core/renderer',
		],
	},
	// {
	// 	output: 'src/three/renderer/API_TEST.md',
	// 	title: '3d-tiles-renderer/three',
	// 	sources: [],
	// },
	// {
	// 	output: 'src/babylonjs/renderer/API_TEST.md',
	// 	title: '3d-tiles-renderer/babylonjs',
	// 	sources: [],
	// },
	// {
	// 	output: 'src/r3f/API_TEST.md',
	// 	title: '3d-tiles-renderer/r3f',
	// 	sources: [],
	// },
];

function runJsDoc( sources ) {

	const args = sources.map( s => `"${s}"` ).join( ' ' );
	const result = execSync(
		`npx jsdoc -X -r ${args}`,
		{ cwd: rootDir }
	).toString();
	return JSON.parse( result );

}

for ( const ep of ENTRY_POINTS ) {

	if ( ep.sources.length === 0 ) {

		console.log( `Skipping ${ep.output}: no sources configured` );
		continue;

	}

	const json = runJsDoc( ep.sources );
	const documented = json.filter( d =>
		d.undocumented !== true &&
		d.kind !== 'package' &&
		d.access !== 'private' &&
		d.inherited !== true &&
		! d.deprecated
	);

	// Sort classes so base classes appear before subclasses
	const classes = documented
		.filter( d => d.kind === 'class' )
		.sort( ( a, b ) => {

			const aIsBase = ! a.augments || a.augments.length === 0;
			const bIsBase = ! b.augments || b.augments.length === 0;
			if ( aIsBase && ! bIsBase ) return - 1;
			if ( ! aIsBase && bIsBase ) return 1;
			return a.name.localeCompare( b.name );

		} );

	// Sort typedefs so plain-object bases appear before derived types
	const typedefs = documented
		.filter( d => d.kind === 'typedef' )
		.sort( ( a, b ) => {

			const aIsBase = ! a.type || a.type.names[ 0 ] === 'Object';
			const bIsBase = ! b.type || b.type.names[ 0 ] === 'Object';
			if ( aIsBase && ! bIsBase ) return - 1;
			if ( ! aIsBase && bIsBase ) return 1;
			return a.name.localeCompare( b.name );

		} );

	// Sort constants by source line order
	const constants = documented
		.filter( d => d.kind === 'constant' && ! d.memberof )
		.sort( ( a, b ) => a.meta.lineno - b.meta.lineno );

	const membersByClass = {};
	for ( const doc of documented ) {

		if ( doc.memberof && doc.kind !== 'class' ) {

			if ( ! membersByClass[ doc.memberof ] ) membersByClass[ doc.memberof ] = [];
			membersByClass[ doc.memberof ].push( doc );

		}

	}

	const sections = [ `# ${ep.title}`, '' ];

	const constantsSection = renderConstants( constants );
	if ( constantsSection ) sections.push( constantsSection );

	for ( const cls of classes ) {

		sections.push( renderClass( cls, membersByClass[ cls.name ] || [] ) );

	}

	for ( const typedef of typedefs ) {

		sections.push( renderTypedef( typedef ) );

	}

	const output = sections.join( '\n' );
	writeFileSync( path.join( rootDir, ep.output ), output );
	console.log( `Written: ${ep.output}` );

}
