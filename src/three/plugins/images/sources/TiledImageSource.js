import { DataCache } from '../utils/DataCache.js';
import { TilingScheme } from '../utils/TilingScheme.js';
import { SRGBColorSpace, Texture } from 'three';
import * as THREE from 'three';

// TODO: support queries for detail at level - ie projected pixel size for geometric error mapping
// Goes here or in "TilingScheme"?
export class TiledImageSource extends DataCache {

	constructor() {

		super();
		this.tiling = new TilingScheme();
		this.fetchOptions = {};
		this.fetchData = ( ...args ) => fetch( ...args );

	}

	// async function for initializing the tiled image set
	init( url ) {

	}

	// helper for processing the buffer into a texture
	async processBufferToTexture( buffer ) {

		const blob = new Blob( [ buffer ] );
		const imageBitmap = await createImageBitmap( blob, {
			premultiplyAlpha: 'none',
			colorSpaceConversion: 'none',
			imageOrientation: 'flipY',
		} );
		const texture = new Texture( imageBitmap );
		texture.generateMipmaps = false;
		texture.colorSpace = SRGBColorSpace;
		texture.needsUpdate = true;

		return texture;

	}

	getMemoryUsage( tex ) {

		// deprecated: remove in next major release
		const { TextureUtils } = THREE;
		if ( ! TextureUtils ) {

			return 0;

		}

		const { format, type, image, generateMipmaps } = tex;
		const { width, height } = image;
		const bytes = TextureUtils.getByteLength( width, height, format, type );
		return generateMipmaps ? bytes * 4 / 3 : bytes;

	}

	// fetch the item with the given key fields
	fetchItem( tokens, signal ) {

		const fetchOptions = {
			...this.fetchOptions,
			signal,
		};
		const url = this.getUrl( ...tokens );
		return this
			.fetchData( url, fetchOptions )
			.then( res => res.arrayBuffer() )
			.then( buffer => this.processBufferToTexture( buffer ) );

	}

	// dispose of the item that was fetched
	disposeItem( texture ) {

		texture.dispose();
		if ( texture.image instanceof ImageBitmap ) {

			texture.image.close();

		}

	}

	getUrl( ...args ) {

	}

}
