import { estimateBytesUsed as _estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TextureUtils } from 'three';

export function estimateBytesUsed( scene ) {

	let totalBytes = 0;
	scene.traverse( c => {

		if ( c.geometry ) {

			totalBytes += _estimateBytesUsed( c.geometry );

		}

		if ( c.material ) {

			const material = c.material;
			for ( const key in material ) {

				const value = material[ key ];
				if ( value && value.isTexture ) {

					const { format, type, image } = value;
					const { width, height } = image;
					const bytes = TextureUtils.getByteLength( width, height, format, type );
					totalBytes += value.generateMipmaps ? bytes * 4 / 3 : bytes;

				}

			}

		}

	} );

	return totalBytes;

}
