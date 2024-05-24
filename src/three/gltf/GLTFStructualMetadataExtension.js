
// https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata

import { StructuralMetadata } from './classes/StructualMetadata.js';

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

	const textureCount = parser.json.textures?.length || 0;
	const result = new Array( textureCount ).fill( null );

	propertyTables.forEach( ( { properties } ) => {

		for ( const key in properties ) {

			const { values } = properties[ key ];
			if ( result[ values ] === null ) {

				result[ values ] = parser.loadBuffer( values );

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
		const rootExtension = extensions && extensions[ EXT_NAME ];
		if ( ! rootExtension ) {

			return;

		}

		const [ textures, buffers ] = Promise.all( [
			getRelevantTextures( parser, rootExtension.propertyTextures ),
			getRelevantBuffers( parser, rootExtension.propertyTables ),
		] );

		scene.traverse( c => {

			if ( parser.associations.has( c ) ) {

				// check if this object has extension references
				const { meshes, primitives } = parser.associations.get( c );
				const primitive = parser.json.meshes[ meshes ].primitives[ primitives ];
				if ( primitive && primitive.extensions && primitive.extensions[ EXT_NAME ] ) {

					// TODO:
					// - only add structural extension if primitive ext is present?
					// - share a common root extension if not on children?
					// - require passing in the relevant geometry to the one root extension?
					const ext = primitive.extensions[ EXT_NAME ];
					/*
					c.userData.structuralMetadata = new StructuralMetadata(
						rootExtension,
						primitiveExtension,
						{ textures, buffers, geometry },
					)
					*/

				}

			}

		} );

	}

}
