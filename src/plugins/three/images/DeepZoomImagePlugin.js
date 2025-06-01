import { ImageFormatPlugin } from './ImageFormatPlugin.js';
import { DeepZoomImageSource } from './sources/DeepZoomImageSource.js';

// Support for Deep Zoom Image format
// https://openseadragon.github.io/

// https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)
export class DeepZoomImagePlugin extends ImageFormatPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'DZI_TILES_PLUGIN';
		this.imageSource = new DeepZoomImageSource();

	}

	async loadRootTileSet() {

		const { tiles, imageSource } = this;
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
		await imageSource.init( url );

		return this.getTileset( url );

	}

}
