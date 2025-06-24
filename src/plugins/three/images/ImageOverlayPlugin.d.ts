import { Color, Matrix4, WebGLRenderer } from 'three';

export class ImageOverlayPlugin {

	constructor( options: {
		overlays: Array<ImageOverlay>,
		renderer: WebGLRenderer,
		resolution?: number,
		frame?: Matrix4 | null,
	} );

	addOverlay( overlay: ImageOverlay, order?: number ): void;
	setOverlayOrder( overlay: ImageOverlay, order?: number ): void;
	deleteOverlay( overlay: ImageOverlay, order?: number ): void;

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

export class CesiumIonOverlay extends ImageOverlay {

	constructor( options: {
		assetId: number | string,
		apiToken: string,
		autoRefreshToken?: boolean

		color: number | Color,
		opacity: number,
	} );

}
