import { PNTSLoaderBase } from '../base/PNTSLoaderBase.js';
import {
	Points,
	PointsMaterial,
	BufferGeometry,
	BufferAttribute,
	DefaultLoadingManager,
	Vector3,
	Color,
} from 'three';
import { rgb565torgb } from '../utilities/rgb565torgb.js';

const DRACO_ATTRIBUTE_MAP = {
	RGB: 'color',
	POSITION: 'position',
};

export class PNTSLoader extends PNTSLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		return super.parse( buffer ).then( async ( result ) => {

			const { featureTable, batchTable } = result;

			const material = new PointsMaterial();
			const extensions = featureTable.header.extensions;
			const translationOffset = new Vector3();
			let geometry;

			// handle loading the draco data
			if ( extensions && extensions[ '3DTILES_draco_point_compression' ] ) {

				const { byteOffset, byteLength, properties } = extensions[ '3DTILES_draco_point_compression' ];
				const dracoLoader = this.manager.getHandler( 'draco.drc' );
				if ( dracoLoader == null ) {

					throw new Error( 'PNTSLoader: dracoLoader not available.' );

				}

				// map PNTS keys to draco types
				const attributeIDs = {};
				for ( const key in properties ) {

					if ( key in DRACO_ATTRIBUTE_MAP && key in properties ) {

						const mappedKey = DRACO_ATTRIBUTE_MAP[ key ];
						attributeIDs[ mappedKey ] = properties[ key ];

					}

				}

				// decode the geometry
				const taskConfig = {
					attributeIDs,
					attributeTypes: {
						position: 'Float32Array',
						color: 'Uint8Array',
					},
					useUniqueIDs: true,
				};

				const buffer = featureTable.getBuffer( byteOffset, byteLength );
				geometry = await dracoLoader.decodeGeometry( buffer, taskConfig );
				if ( geometry.attributes.color ) {

					material.vertexColors = true;

				}

			} else {

				// handle non compressed case
				const POINTS_LENGTH = featureTable.getData( 'POINTS_LENGTH' );
				const POSITION = featureTable.getData( 'POSITION', POINTS_LENGTH, 'FLOAT', 'VEC3' );
				const RGB = featureTable.getData( 'RGB', POINTS_LENGTH, 'UNSIGNED_BYTE', 'VEC3' );
				const RGBA = featureTable.getData( 'RGBA', POINTS_LENGTH, 'UNSIGNED_BYTE', 'VEC4' );
				const RGB565 = featureTable.getData( 'RGB565', POINTS_LENGTH, 'UNSIGNED_SHORT', 'SCALAR' );
				const CONSTANT_RGBA = featureTable.getData( 'CONSTANT_RGBA', POINTS_LENGTH, 'UNSIGNED_BYTE', 'VEC4' );
				const POSITION_QUANTIZED = featureTable.getData( 'POSITION_QUANTIZED', POINTS_LENGTH, 'UNSIGNED_SHORT', 'VEC3' );
				const QUANTIZED_VOLUME_SCALE = featureTable.getData( 'QUANTIZED_VOLUME_SCALE', POINTS_LENGTH, 'FLOAT', 'VEC3' );
				const QUANTIZED_VOLUME_OFFSET = featureTable.getData( 'QUANTIZED_VOLUME_OFFSET', POINTS_LENGTH, 'FLOAT', 'VEC3' );

				geometry = new BufferGeometry();

				if ( POSITION_QUANTIZED ) {

					const decodedPositions = new Float32Array( POINTS_LENGTH * 3 );
					for ( let i = 0; i < POINTS_LENGTH; i ++ ) {

						for ( let j = 0; j < 3; j ++ ) {

							const index = 3 * i + j;
							decodedPositions[ index ] = ( POSITION_QUANTIZED[ index ] / 65535.0 ) * QUANTIZED_VOLUME_SCALE[ j ];

						}

					}
					translationOffset.x = QUANTIZED_VOLUME_OFFSET[ 0 ];
					translationOffset.y = QUANTIZED_VOLUME_OFFSET[ 1 ];
					translationOffset.z = QUANTIZED_VOLUME_OFFSET[ 2 ];
					geometry.setAttribute( 'position', new BufferAttribute( decodedPositions, 3, false ) );

				} else {

					geometry.setAttribute( 'position', new BufferAttribute( POSITION, 3, false ) );

				}

				if ( RGBA !== null ) {

					geometry.setAttribute( 'color', new BufferAttribute( RGBA, 4, true ) );
					material.vertexColors = true;
					material.transparent = true;
					material.depthWrite = false;

				} else if ( RGB !== null ) {

					geometry.setAttribute( 'color', new BufferAttribute( RGB, 3, true ) );
					material.vertexColors = true;

				} else if ( RGB565 !== null ) {

					const color = new Uint8Array( POINTS_LENGTH * 3 );
					for ( let i = 0; i < POINTS_LENGTH; i ++ ) {

						const rgbColor = rgb565torgb( RGB565[ i ] );
						for ( let j = 0; j < 3; j ++ ) {

							const index = 3 * i + j;
							color[ index ] = rgbColor[ j ];

						}

					}
					geometry.setAttribute( 'color', new BufferAttribute( color, 3, true ) );
					material.vertexColors = true;

				} else if ( CONSTANT_RGBA !== null ) {

					const color = new Color( CONSTANT_RGBA[ 0 ], CONSTANT_RGBA[ 1 ], CONSTANT_RGBA[ 2 ] );
					material.color = color;
					const opacity = CONSTANT_RGBA[ 3 ] / 255;
					if ( opacity < 1 ) {

						material.opacity = opacity;
						material.transparent = true;
						material.depthWrite = false;

					}

				}

			}

			[
				'BATCH_LENGTH',
				'NORMAL',
				'NORMAL_OCT16P',
			].forEach( ( feature ) => {

				if ( feature in featureTable.header ) {

					console.warn(
						`PNTSLoader: Unsupported FeatureTable feature "${feature}" detected.`
					);

				}

			} );

			const object = new Points( geometry, material );
			object.position.copy( translationOffset );
			result.scene = object;
			result.scene.featureTable = featureTable;
			result.scene.batchTable = batchTable;

			const rtcCenter = featureTable.getData( 'RTC_CENTER' );
			if ( rtcCenter ) {

				result.scene.position.x += rtcCenter[ 0 ];
				result.scene.position.y += rtcCenter[ 1 ];
				result.scene.position.z += rtcCenter[ 2 ];

			}

			return result;

		} );

	}

}
