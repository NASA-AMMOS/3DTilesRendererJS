import { PassThroughBatchedMesh } from './PassThroughBatchedMesh.js';
import { RGFormat, UnsignedByteType, DataTexture } from 'three';
import { wrapFadeMaterial } from './wrapFadeMaterial.js';

// BatchedMesh instance that can fade materials
export class FadeBatchedMesh extends PassThroughBatchedMesh {

	constructor( ...args ) {

		super( ...args );

		// construct a version of the material that supports fading
		const material = this.material;
		const params = wrapFadeMaterial( material, material.onBeforeCompile );
		material.defines.FEATURE_FADE = 1;
		material.defines.USE_BATCHING_FRAG = 1;
		material.needsUpdate = true;

		// fade parameters
		this.fadeTexture = null;
		this._fadeParams = params;

	}

	// Set the fade state
	setFadeAt( index, fadeIn, fadeOut ) {

		this._initFadeTexture();
		this.fadeTexture.setValueAt( index, fadeIn * 255, fadeOut * 255 );

	}

	// initialize the texture and resize it if needed
	_initFadeTexture() {

		// calculate the new size
		let size = Math.sqrt( this._maxInstanceCount );
		size = Math.ceil( size );

		const length = size * size * 2;
		const oldFadeTexture = this.fadeTexture;
		if ( ! oldFadeTexture || oldFadeTexture.image.data.length !== length ) {

			// 2 bytes per RG pixel
			const fadeArray = new Uint8Array( length );
			const fadeTexture = new InstanceDataTexture( fadeArray, size, size, RGFormat, UnsignedByteType );

			// copy the data from the old fade texture if it exists
			if ( oldFadeTexture ) {

				oldFadeTexture.dispose();

				const src = oldFadeTexture.image.data;
				const dst = this.fadeTexture.image.data;
				const len = Math.min( src.length, dst.length );
				dst.set( new src.constructor( src.buffer, 0, len ) );

			}

			// assign the new fade texture to the uniform, member variable
			this.fadeTexture = fadeTexture;
			this._fadeParams.fadeTexture.value = fadeTexture;
			fadeTexture.needsUpdate = true;

		}

	}

	// dispose the fade texture. Super cannot be used here due to proxy
	dispose() {

		if ( this.fadeTexture ) {

			this.fadeTexture.dispose();

		}

	}

}

// Version of data texture that can assign pixel values
class InstanceDataTexture extends DataTexture {

	setValueAt( instance, ...values ) {

		const { data, width, height } = this.image;
		const itemSize = Math.floor( data.length / ( width * height ) );
		let needsUpdate = false;
		for ( let i = 0; i < itemSize; i ++ ) {

			const index = instance * itemSize + i;
			const prevValue = data[ index ];
			const newValue = values[ i ] || 0;
			if ( prevValue !== newValue ) {

				data[ index ] = newValue;
				needsUpdate = true;

			}

		}

		if ( needsUpdate ) {

			this.needsUpdate = true;

		}

	}

}
