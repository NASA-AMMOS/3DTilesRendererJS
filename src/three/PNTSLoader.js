import { PNTSLoaderBase } from '../base/PNTSLoaderBase.js';
import {
	Points,
	PointsMaterial,
	BufferGeometry,
	BufferAttribute,
	DefaultLoadingManager,
	Vector3,
} from 'three';

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

			const { featureTable } = result;

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

				if ( RGB !== null ) {

					geometry.setAttribute( 'color', new BufferAttribute( RGB, 3, true ) );
					material.vertexColors = true;

				}

			}

			[
				'CONSTANT_RGBA',
				'BATCH_LENGTH',
				'RGBA',
				'RGB565',
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
