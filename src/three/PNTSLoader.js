import { PNTSLoaderBase } from '../base/PNTSLoaderBase.js';
import {
	Points,
	PointsMaterial,
	BufferGeometry,
	BufferAttribute,
	DefaultLoadingManager,
} from 'three';

export class PNTSLoader extends PNTSLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		return super.parse( buffer ).then( async ( result ) => {

			const { featureTable } = result;

			let geometry = new BufferGeometry();
			const material = new PointsMaterial();
			material.size = 2;
			material.sizeAttenuation = false;

			if ( featureTable.isDracoEncoded() ) {

				// get draco loader for .pnts files
				const dracoLoader = this.manager.getHandler( 'test.pnts' );

				featureTable.setDracoLoader( dracoLoader );

				geometry = await featureTable.getDracoEncodedGeometry();

				if ( geometry.attributes.color ) {

					geometry.attributes.color.normalized = true;
					material.vertexColors = true;

				}

			} else {

				const POINTS_LENGTH = featureTable.getData( 'POINTS_LENGTH' );
				const POSITION = featureTable.getData( 'POSITION', POINTS_LENGTH, 'FLOAT', 'VEC3' );
				const RGB = featureTable.getData( 'RGB', POINTS_LENGTH, 'UNSIGNED_BYTE', 'VEC3' );

				geometry.setAttribute( 'position', new BufferAttribute( POSITION, 3, false ) );

				if ( RGB !== null ) {

					geometry.setAttribute( 'color', new BufferAttribute( RGB, 3, true ) );
					material.vertexColors = true;

				}

			}

			[
				'QUANTIZED_VOLUME_OFFSET',
				'QUANTIZED_VOLUME_SCALE',
				'CONSTANT_RGBA',
				'BATCH_LENGTH',
				'POSITION_QUANTIZED',
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
