import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { renderClass } from './RenderDocsUtils.js';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const rootDir = path.resolve( __dirname, '../..' );

// Entry point definitions — source files to scan and where to write output.
// Add source files here as JSDoc comments are added to each entry point.
const ENTRY_POINTS = [
	{
		output: 'src/three/plugins/API_TEST.md',
		title: '3d-tiles-renderer/three/plugins',
		sources: [
			'src/three/plugins/images/sources/WMTSImageSource.js',
		],
	},
	// Uncomment and populate as JSDoc coverage grows:
	// {
	// 	output: 'src/core/renderer/API_TEST.md',
	// 	title: '3d-tiles-renderer/core',
	// 	sources: [],
	// },
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
		`npx jsdoc -X ${args}`,
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
		d.access !== 'private'
	);

	const classes = documented.filter( d => d.kind === 'class' );
	const membersByClass = {};
	for ( const doc of documented ) {

		if ( doc.memberof && doc.kind !== 'class' ) {

			if ( ! membersByClass[ doc.memberof ] ) membersByClass[ doc.memberof ] = [];
			membersByClass[ doc.memberof ].push( doc );

		}

	}

	const sections = [ `# ${ep.title}`, '' ];

	for ( const cls of classes ) {

		sections.push( renderClass( cls, membersByClass[ cls.name ] || [] ) );

	}

	const output = sections.join( '\n' );
	writeFileSync( path.join( rootDir, ep.output ), output );
	console.log( `Written: ${ep.output}` );

}
