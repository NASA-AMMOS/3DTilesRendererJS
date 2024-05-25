
// https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata

import { FileLoader } from 'three';
import { NodeStructuralMetaData, StructuralMetadata } from './classes/StructualMetadata.js';

const EXT_NAME = 'EXT_structural_metadata';
function getRelevantTextures( parser, propertyTextures = [] ) {

	const textureCount = parser.json.textures?.length || 0;
	const result = new Array( textureCount ).fill( null );

	propertyTextures.forEach( ( { properties } ) => {

		for ( const key in properties ) {

			const { index } = properties[ key ];
			if ( result[ index ] === null ) {

				result[ index ] = parser.loadTexture( index );

			}

		}

	} );

	return Promise.all( result );

}

function getRelevantBuffers( parser, propertyTables = [] ) {

	const textureCount = parser.json.bufferViews?.length || 0;
	const result = new Array( textureCount ).fill( null );

	propertyTables.forEach( ( { properties } ) => {

		for ( const key in properties ) {

			const { values, arrayOffsets, stringOffsets } = properties[ key ];
			if ( result[ values ] === null ) {

				result[ values ] = parser.loadBufferView( values );

			}

			if ( result[ arrayOffsets ] === null ) {

				result[ arrayOffsets ] = parser.loadBufferView( arrayOffsets );

			}

			if ( result[ stringOffsets ] === null ) {

				result[ stringOffsets ] = parser.loadBufferView( stringOffsets );

			}

		}

	} );

	return Promise.all( result );

}

export class GLTFStructuralMetadataExtension {

	constructor( parser ) {

		this.parser = parser;
		this.name = EXT_NAME;

	}

	async afterRoot( { scene, parser } ) {

		const extensions = parser.json.extensions;
		let rootExtension = extensions && extensions[ EXT_NAME ];
		if ( ! rootExtension ) {

			return;

		}

		// load the remote schema definition if present
		let schemaPromise = null;
		if ( rootExtension.schemaUri ) {

			// TODO: cache the loaded schema so we can share it and dispose of it when the
			// extension is no longer available
			const { manager, path, requestHeader, crossOrigin } = parser.options;
			const finalUri = new URL( rootExtension.schemaUri, path ).toString();
			const fileLoader = new FileLoader( manager );
			fileLoader.setCrossOrigin( crossOrigin );
			fileLoader.setResponseType( 'json' );
			fileLoader.setRequestHeader( requestHeader );

			schemaPromise = fileLoader.loadAsync( finalUri )
				.then( schema => {

					rootExtension = { ...rootExtension, schema };

				} );

		}

		// prep the textures and buffers
		const [ textures, buffers ] = await Promise.all( [
			getRelevantTextures( parser, rootExtension.propertyTextures ),
			getRelevantBuffers( parser, rootExtension.propertyTables ),
			schemaPromise,
		] );

		// initialize the extension
		const rootMetadata = new StructuralMetadata( rootExtension, textures, buffers );
		scene.userData.structuralMetadata = rootMetadata;

		scene.traverse( child => {

			if ( parser.associations.has( child ) ) {

				// check if this object has extension references
				const { meshes, primitives } = parser.associations.get( child );
				const primitive = parser.json.meshes[ meshes ].primitives[ primitives ];
				if ( primitive && primitive.extensions && primitive.extensions[ EXT_NAME ] ) {

					const extension = primitive.extensions[ EXT_NAME ];
					child.userData.structuralMetadata = new StructuralMetadata( rootExtension, textures, buffers, extension, child );

				} else {

					child.userData.structuralMetadata = rootMetadata;

				}

			}

		} );

	}

}
