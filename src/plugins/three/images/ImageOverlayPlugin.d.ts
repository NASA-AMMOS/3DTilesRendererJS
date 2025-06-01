import { Color, WebGLRenderer } from 'three';

export class ImageOverlayPlugin {

	constructor( options: {
		overlays: Array<ImageOverlay>,
		renderer: WebGLRenderer,
		resolution?: number,
	} );

	addOverlay( overlay: ImageOverlay, order?: number );
	setOverlayOrder( overlay: ImageOverlay, order?: number );
	deleteOverlay( overlay: ImageOverlay, order?: number );

}

export class ImageOverlay {}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options: {
		levels: number,
		dimension: number,
		url: string,

		color: number | Color,
		opacity: number,
	} );

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options: {
		url: string,

		color: number | Color,
		opacity: number,
	} );

}
