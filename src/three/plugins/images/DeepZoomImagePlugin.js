import { ImageFormatPlugin } from './ImageFormatPlugin.js';
import { DeepZoomImageSource } from './sources/DeepZoomImageSource.js';

// Support for Deep Zoom Image format
// https://openseadragon.github.io/

// https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)
/**
 * Plugin that renders a Deep Zoom Image (DZI) as a 3D Tiles-compatible tiled texture.
 * Only a single embedded "Image" is supported. Pass the `.dzi` XML file URL as the
 * `TilesRenderer` URL.
 * See the {@link https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95) Deep Zoom specification}.
 * @param {Object} [options]
 * @param {string} [options.url] URL to the `.dzi` descriptor file.
 * @param {boolean} [options.center=false] Shift the DZI tiles so the image is centered at the origin rather than at the top-left corner.
 * @param {boolean} [options.useRecommendedSettings=true] If true, set the `TilesRenderer` error target to the device pixel ratio.
 */
export class DeepZoomImagePlugin extends ImageFormatPlugin {

	constructor( options = {} ) {

		const { url, ...rest } = options;
		super( rest );

		this.name = 'DZI_TILES_PLUGIN';
		this.imageSource = new DeepZoomImageSource( { url } );

	}

}
