import { PassThroughBatchedMesh } from './PassThroughBatchedMesh.js';
import { InstanceDataTexture } from './InstanceDataTexture.js';
import { FloatType, RGFormat } from 'three';

export class FadeBatchedMesh extends PassThroughBatchedMesh {

	constructor( ...args ) {

		super( ...args );

		this.fadeTexture = null;
		this._initFadeTexture();

	}

	_initFadeTexture() {

		let size = Math.sqrt( this._maxInstanceCount );
		size = Math.ceil( size );

		// 4 floats per RGBA pixel initialized to white
		const fadeArray = new Float32Array( size * size * 4 ).fill( 1 );
		const fadeTexture = new InstanceDataTexture( fadeArray, size, size, RGFormat, FloatType );

		this.fadeTexture = fadeTexture;

	}

	setInstanceCount( ...args ) {

		super.setInstanceCount( ...args );

		// update texture data for instance sampling
		const oldFadeTexture = this.fadeTexture;
		oldFadeTexture.dispose();
		this._initFadeTexture();

		const src = oldFadeTexture.image.data;
		const dst = this.fadeTexture.image.data;
		const len = Math.min( src.length, dst.length );
		dst.set( new src.constructor( src.buffer, 0, len ) );

	}

}
