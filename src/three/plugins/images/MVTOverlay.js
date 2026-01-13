import { XYZTilesOverlay } from './ImageOverlayPlugin.js';
import { MVTImageSource } from './sources/MVTImageSource.js';

export class MVTOverlay extends XYZTilesOverlay {

	constructor( options = {} ) {

		super( options );
		// Replace the default XYZ source with our custom MVT source
		this.imageSource = new MVTImageSource( options );

	}

}
