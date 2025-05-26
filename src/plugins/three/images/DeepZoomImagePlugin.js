import { ImageFormatPlugin } from './ImageFormatPlugin.js';

// Support for Deep Zoom Image format
// https://openseadragon.github.io/

// https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)
export class DeepZoomImagePlugin extends ImageFormatPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'DZI_TILES_PLUGIN';
		this.stem = null;
		this.format = null;
		this.flipY = true;

	}

	getUrl( level, x, y ) {

		return `${ this.stem }_files/${ level }/${ x }_${ y }.${ this.format }`;

	}

	loadRootTileSet() {

		const { tiles } = this;

		// transform the url
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		// If implementing DeepZoom with limitations like a fixed orthographic camera perspective then
		// the target tile level can be immediately 'jumped' to for the entire image and in-view tiles
		// can be immediately queried without any hierarchy traversal. Due the flexibility of camera
		// type, rotation, and per-tile error calculation we generate a hierarchy.
		return tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
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
				this.overlap = overlap;
				this.format = format;
				this.stem = url.split( /\.[^.]+$/g )[ 0 ];

				// Assign tiling properties
				const { tiling } = this;
				const levels = Math.ceil( Math.log2( Math.max( width, height ) ) ) + 1;
				tiling.generateLevels( levels, 1, 1, {
					tilePixelWidth: tileSize,
					tilePixelHeight: tileSize,
					pixelWidth: width,
					pixelHeight: height,
				} );

				// TODO
				tiling.setBounds( 0, 0, width, height );

				return this.getTileset( url );

			} );

	}

}
