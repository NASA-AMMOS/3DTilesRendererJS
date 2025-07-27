import { ImageFormatPlugin } from './ImageFormatPlugin.js';
import { DeepZoomImageSource } from './sources/DeepZoomImageSource.js';

// Support for Deep Zoom Image format
// https://openseadragon.github.io/

// https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)
export class DeepZoomImagePlugin extends ImageFormatPlugin {

	constructor( options = {} ) {

		const { url, ...rest } = options;
		super( rest );

		this.name = 'DZI_TILES_PLUGIN';
		this.imageSource = new DeepZoomImageSource( { url } );

	}

}
