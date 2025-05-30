import { DataCache } from '../utils/DataCache.js';
import { TilingScheme } from '../utils/TilingScheme.js';
import { SRGBColorSpace, Texture } from 'three';

export class TiledImageSource extends DataCache {

	constructor() {

		super();
		this.tiling = new TilingScheme();
		this.fetchOptions = {};
		this.fetchData = ( ...args ) => fetch( ...args );

	}

	init( url ) {

	}

	fetchItem( ...args ) {

		const url = this.getURL( ...args );
		return this
			.fetchData( url, this.fetchOptions )
			.then( res => res.arrayBuffer() )
			.then( async buffer => {

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

			} );

	}

	dispose( texture ) {

		texture.dispose();
		if ( texture.image instanceof ImageBitmap ) {

			texture.image.close();

		}

	}

	getURL( ...args ) {

	}

}
