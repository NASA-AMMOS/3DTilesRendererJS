import { estimateBytesUsed as _estimateBytesUsed } from 'three/addons/utils/BufferGeometryUtils.js';
import { TextureUtils } from 'three';

// Returned when a texture's size cannot be determined (missing image, unknown
// format, etc).
const UNKNOWN_TEXTURE_BYTE_LENGTH = 0;

function getFormatByteLength( width, height, format, type ) {

	try {

		return TextureUtils.getByteLength( width, height, format, type );

	} catch {

		return UNKNOWN_TEXTURE_BYTE_LENGTH;

	}

}

export function getTextureByteLength( tex ) {

	if ( ! tex ) {

		return 0;

	}

	// External textures track their own byte length via userData (eg. spark
	// textures created from an ImageBitmap or uploaded by a third-party lib).
	if ( tex.isExternalTexture ) {

		return tex.userData?.byteLength ?? UNKNOWN_TEXTURE_BYTE_LENGTH;

	}

	const { format, type, image, mipmaps } = tex;

	// Block-compressed 2D textures carry their mip chain as an array of
	// { data, width, height } entries. Summing the existing data buffers is
	// the most reliable size source.
	if ( tex.isCompressedTexture && Array.isArray( mipmaps ) && mipmaps.length > 0 ) {

		let bytes = 0;
		for ( const mip of mipmaps ) {

			if ( mip?.data?.byteLength ) {

				bytes += mip.data.byteLength;

			} else {

				bytes += getFormatByteLength( mip.width, mip.height, format, type );

			}

		}

		return bytes;

	}

	if ( ! image ) {

		return UNKNOWN_TEXTURE_BYTE_LENGTH;

	}

	let bytes = getFormatByteLength( image.width, image.height, format, type );
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

					totalBytes += getTextureByteLength( value );
					dedupeSet.add( value );

				}

			}

		}

	} );

	return totalBytes;

}
