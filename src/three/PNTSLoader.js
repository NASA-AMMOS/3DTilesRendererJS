import { PNTSLoaderBase } from '../base/PNTSLoaderBase.js';
import { Points, PointsMaterial, BufferGeometry, BufferAttribute, DefaultLoadingManager } from 'three';

export class PNTSLoader extends PNTSLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		return super
			.parse( buffer )
			.then( result => {

				const { featureTable } = result;

				const POINTS_LENGTH = featureTable.getData( 'POINTS_LENGTH' );
				const POSITION = featureTable.getData( 'POSITION', POINTS_LENGTH, 'FLOAT', 'VEC3' );
				const RGB = featureTable.getData( 'RGB', POINTS_LENGTH, 'UNSIGNED_BYTE', 'VEC3' );

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
				].forEach( feature => {

					if ( feature in featureTable.header ) {

						console.warn( `PNTSLoader: Unsupported FeatureTable feature "${ feature }" detected.` );

					}

				} );

				const geometry = new BufferGeometry();
				geometry.setAttribute( 'position', new BufferAttribute( POSITION, 3, false ) );

				const material = new PointsMaterial();
				material.size = 2;
				material.sizeAttenuation = false;

				if ( RGB !== null ) {

					geometry.setAttribute( 'color', new BufferAttribute( RGB, 3, true ) );
					material.vertexColors = true;

				}

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
