import { PNTSLoaderBase } from '../base/PNTSLoaderBase.js';
import { Points, PointsMaterial, BufferGeometry, BufferAttribute, DefaultLoadingManager } from 'three';

export class PNTSLoader extends PNTSLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		const result = super.parse( buffer );
		const { featureTable } = result;

		// global semantics
		const POINTS_LENGTH = featureTable.getData( 'POINTS_LENGTH' );

		// RTC_CENTER
		// QUANTIZED_VOLUME_OFFSET
		// QUANTIZED_VOLUME_SCALE
		// CONSTANT_RGBA
		// BATCH_LENGTH

		const POSITION = featureTable.getData( 'POSITION', POINTS_LENGTH, 'FLOAT', 'VEC3' );
		const RGB = featureTable.getData( 'RGB', POINTS_LENGTH, 'UNSIGNED_BYTE', 'VEC3' );

		// POSITION_QUANTIZED
		// RGBA
		// RGB565
		// NORMAL
		// NORMAL_OCT16P
		// BATCH_ID

		if ( POSITION === null ) {

			throw new Error( 'PNTSLoader : POSITION_QUANTIZED feature type is not supported.' );

		}

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

		return result;

	}

}
