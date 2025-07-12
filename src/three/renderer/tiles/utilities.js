import { estimateBytesUsed as _estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';

export function safeTextureGetByteLength( tex ) {

	// NOTE: This is for backwards compatibility and should be removed later
	// deprecated: remove in next major release
	const { TextureUtils } = THREE;
	if ( ! TextureUtils || ! tex ) {

		return 0;

	}


	const { format, type, image } = tex;
	const { width, height } = image;

	let bytes = TextureUtils.getByteLength( width, height, format, type );
	bytes *= tex.generateMipmaps ? 4 / 3 : 1;

	return bytes;


}

// Returns the estimated number of bytes used by the object
export function estimateBytesUsed( object ) {

	const dedupeSet = new Set();

	let totalBytes = 0;
	object.traverse( c => {

		// get geometry bytes
		if ( c.geometry && ! dedupeSet.has( c.geometry ) ) {

			totalBytes += _estimateBytesUsed( c.geometry );
			dedupeSet.add( c.geometry );

		}

		// get material bytes
		if ( c.material ) {

			const material = c.material;
			for ( const key in material ) {

				const value = material[ key ];
				if ( value && value.isTexture && ! dedupeSet.has( value ) ) {

					totalBytes += safeTextureGetByteLength( value );
					dedupeSet.add( value );

				}

			}

		}

	} );

	return totalBytes;

}
