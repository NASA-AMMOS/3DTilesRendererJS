import { TiledImageSource } from './TiledImageSource.js';

export class DeepZoomImageSource extends TiledImageSource {

	constructor( ...args ) {

		super( ...args );

		this.format = null;
		this.stem = null;

	}

	getUrl( x, y, level ) {

		return `${ this.stem }_files/${ level }/${ x }_${ y }.${ this.format }`;

	}

	init( url ) {

		// If implementing DeepZoom with limitations like a fixed orthographic camera perspective then
		// the target tile level can be immediately 'jumped' to for the entire image and in-view tiles
		// can be immediately queried without any hierarchy traversal. Due the flexibility of camera
		// type, rotation, and per-tile error calculation we generate a hierarchy.
		return this
			.fetchData( url, this.fetchOptions )
			.then( res => res.text() )
			.then( text => {

				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				if ( xml.querySelector( 'DisplayRects' ) || xml.querySelector( 'Collection' ) ) {

					throw new Error( 'DeepZoomImagesPlugin: DisplayRect and Collection DZI files not supported.' );

				}

				// Elements
				const image = xml.querySelector( 'Image' );
				const size = image.querySelector( 'Size' );

				// Image properties
				const width = parseInt( size.getAttribute( 'Width' ) );
				const height = parseInt( size.getAttribute( 'Height' ) );
				const tileSize = parseInt( image.getAttribute( 'TileSize' ) );
				const overlap = parseInt( image.getAttribute( 'Overlap' ) );
				const format = image.getAttribute( 'Format' );

				// Assign deep zoom properties
				this.format = format;
				this.stem = url.split( /\.[^.]+$/g )[ 0 ];

				// Assign tiling properties
				const { tiling } = this;
				const levels = Math.ceil( Math.log2( Math.max( width, height ) ) ) + 1;
				tiling.flipY = true;
				tiling.pixelOverlap = overlap;
				tiling.generateLevels( levels, 1, 1, {
					tilePixelWidth: tileSize,
					tilePixelHeight: tileSize,
					pixelWidth: width,
					pixelHeight: height,
				} );

			} );

	}

}
