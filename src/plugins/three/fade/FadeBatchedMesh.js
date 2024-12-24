import { PassThroughBatchedMesh } from './PassThroughBatchedMesh.js';
import { InstanceDataTexture } from './InstanceDataTexture.js';
import { RGFormat, UnsignedByteType } from 'three';
import { wrapFadeMaterial } from './wrapFadeMaterial.js';

export class FadeBatchedMesh extends PassThroughBatchedMesh {

	constructor( ...args ) {

		super( ...args );

		const material = this.material;
		const params = wrapFadeMaterial( material, material.onBeforeCompile );
		material.defines.FEATURE_FADE = 1;
		material.defines.USE_BATCHING_FRAG = 1;
		material.needsUpdate = true;

		this.fadeTexture = null;
		this._fadeParams = params;

		this._initFadeTexture();


	}

	setFadeAt( index, fadeIn, fadeOut ) {

		this._initFadeTexture();
		this.fadeTexture.setValueAt( index, fadeIn * 255, fadeOut * 255 );

	}

	_initFadeTexture() {

		let size = Math.sqrt( this._maxInstanceCount );
		size = Math.ceil( size );

		const oldFadeTexture = this.fadeTexture;
		if ( ! this.fadeTexture || this.fadeTexture.image.data.length !== size * size * 2 ) {

			// 4 floats per RGBA pixel initialized to white
			const fadeArray = new Uint8Array( size * size * 2 );
			const fadeTexture = new InstanceDataTexture( fadeArray, size, size, RGFormat, UnsignedByteType );

			if ( oldFadeTexture ) {

				const src = oldFadeTexture.image.data;
				const dst = this.fadeTexture.image.data;
				const len = Math.min( src.length, dst.length );
				dst.set( new src.constructor( src.buffer, 0, len ) );

			}

			this.fadeTexture = fadeTexture;
			this._fadeParams.fadeTexture.value = fadeTexture;
			fadeTexture.needsUpdate = true;

		}

	}

	dispose() {

		this.fadeTexture.dispose();

	}

}
