import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { renderClass, renderComponent, renderTypedef, renderConstants, toAnchor } from './RenderDocsUtils.js';
import { findRootDir } from '../CommandUtils.js';

const ROOT_DIR = findRootDir();

const ENTRY_POINTS = [
	{
		output: 'src/three/plugins/API.md',
		title: '3d-tiles-renderer/three/plugins',
		source: 'src/three/plugins/images/sources/WMTSImageSource.js',
	},
	{
		output: 'src/core/renderer/API.md',
		title: '3d-tiles-renderer/core',
		source: 'src/core/renderer',
	},
	// {
	// 	output: 'src/three/renderer/API.md',
	// 	title: '3d-tiles-renderer/three',
	// 	source: null,
	// },
	{
		output: 'src/babylonjs/renderer/API.md',
		title: '3d-tiles-renderer/babylonjs',
		source: 'src/babylonjs/renderer',
	},
	{
		output: 'src/core/plugins/API.md',
		title: '3d-tiles-renderer/core/plugins',
		source: 'src/core/plugins',
	},
	{
		output: 'src/r3f/API.md',
		title: '3d-tiles-renderer/r3f',
		source: 'src/r3f/components',
	},
];

// Run JSDoc for all entry points and build a global type registry for cross-file links
const results = ENTRY_POINTS.map( entry => ( {
	entry,
	jsdoc: filterDocumented( runJsDoc( path.resolve( ROOT_DIR, entry.source ) ) )
} ) );

// Doclet type predicates
const isClass = d => d.kind === 'class';
const isObjectTypedef = d => d.kind === 'typedef' && d.type.names[ 0 ] !== 'function';
const isCallbackTypedef = d => d.kind === 'typedef' && d.type.names[ 0 ] === 'function';
const isReactComponent = d => ( d.kind === 'function' || d.kind === 'constant' ) && d.tags && d.tags.some( t => t.title === 'component' );
const isConstant = d => d.kind === 'constant' && ! d.memberof && ! isReactComponent( d );

// Only classes, non-callback typedefs, and React components get sections (and therefore anchors) in the output.
const typeRegistry = {}; // name -> output path
for ( const { entry, jsdoc } of results ) {

	for ( const d of jsdoc ) {

		if ( isClass( d ) || isObjectTypedef( d ) || isReactComponent( d ) ) {

			typeRegistry[ d.name ] = entry.output;

		}

	}

}

// Pass 2: render each entry point.
for ( const { entry, jsdoc } of results ) {

	const resolveLink = name => {

		// no link
		const targetFile = typeRegistry[ name ];
		if ( ! targetFile ) {

			return null;

		}

		const anchor = `#${ toAnchor( name ) }`;
		if ( targetFile === entry.output ) {

			// anchor is in the same file
			return anchor;

		}

		// relative path + anchor for a different file
		const fromDir = path.dirname( path.join( ROOT_DIR, entry.output ) );
		const toFile = path.join( ROOT_DIR, targetFile );
		const relativePath = path.relative( fromDir, toFile ).replace( /\\/g, '/' );
		return relativePath + anchor;

	};

	// Sort classes so base classes appear before subclasses
	const classes = jsdoc
		.filter( d => isClass( d ) )
		.sort( ( a, b ) => {

			const aIsBase = ! a.augments || a.augments.length === 0;
			const bIsBase = ! b.augments || b.augments.length === 0;
			if ( aIsBase && ! bIsBase ) return - 1;
			if ( ! aIsBase && bIsBase ) return 1;
			return a.name.localeCompare( b.name );

		} );

	// collect @callback typedefs into a map for inline substitution
	const callbackMap = {};
	for ( const d of jsdoc ) {

		if ( isCallbackTypedef( d ) ) {

			callbackMap[ d.name ] = d;

		}

	}

	// Sort typedefs so plain-object bases appear before derived types; exclude @callback entries
	const typedefs = jsdoc
		.filter( d => isObjectTypedef( d ) )
		.sort( ( a, b ) => {

			const aIsBase = a.type.names[ 0 ] === 'Object';
			const bIsBase = b.type.names[ 0 ] === 'Object';
			if ( aIsBase && ! bIsBase ) return - 1;
			if ( ! aIsBase && bIsBase ) return 1;
			return a.name.localeCompare( b.name );

		} );

	// sort components by source line order
	const components = jsdoc
		.filter( d => isReactComponent( d ) )
		.sort( ( a, b ) => a.meta.lineno - b.meta.lineno );

	// sort constants by source line order
	const constants = jsdoc
		.filter( d => isConstant( d ) )
		.sort( ( a, b ) => a.meta.lineno - b.meta.lineno );

	// cache all fields by associated class name
	const classMembers = {};
	for ( const doc of jsdoc ) {

		if ( doc.memberof && doc.kind !== 'class' ) {

			if ( ! classMembers[ doc.memberof ] ) {

				classMembers[ doc.memberof ] = [];

			}

			classMembers[ doc.memberof ].push( doc );

		}

	}

	// construct the readme files
	const sections = [ `# ${ entry.title }`, '' ];

	sections.push( renderConstants( constants, callbackMap ) );

	for ( const component of components ) {

		sections.push( renderComponent( component, callbackMap ) );

	}

	for ( const cls of classes ) {

		sections.push( renderClass( cls, classMembers[ cls.name ] || [], callbackMap, resolveLink ) );

	}

	for ( const typedef of typedefs ) {

		sections.push( renderTypedef( typedef, callbackMap, resolveLink ) );

	}

	const output = sections.join( '\n' );
	fs.writeFileSync( path.join( ROOT_DIR, entry.output ), output );
	console.log( `Written: ${ entry.output }` );

}

//

function runJsDoc( source ) {

	const result = execSync( `npx jsdoc -X -r "${ source }"` ).toString();
	return JSON.parse( result );

}

function filterDocumented( json ) {

	return json.filter( d =>
		d.undocumented !== true &&
		d.kind !== 'package' &&
		d.access !== 'private' &&
		d.inherited !== true &&
		! d.deprecated
	);

}
