import { Color, Matrix4, WebGLRenderer } from 'three';

export class ImageOverlayPlugin {

	constructor( options: {
		overlays: Array<ImageOverlay>,
		renderer: WebGLRenderer,
		resolution?: number,
		enableTileSplitting?: boolean,
	} );

	addOverlay( overlay: ImageOverlay, order?: number ): void;
	setOverlayOrder( overlay: ImageOverlay, order?: number ): void;
	deleteOverlay( overlay: ImageOverlay ): void;

}

export class ImageOverlay {

	color: number | Color;
	opacity: number;
	frame?: Matrix4 | null;

}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options: {
		levels: number,
		dimension: number,
		url: string,
		bounds?: [ number, number, number, number ],

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
	} );

}

export class WMTSTilesOverlay extends ImageOverlay {

	constructor( options: {
		levels: number,
		dimension: number,
		url: string,
		bounds?: [ number, number, number, number ],

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
	} );

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options: {
		url: string,

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
	} );

}

export class CesiumIonOverlay extends ImageOverlay {

	constructor( options: {
		assetId: number | string,
		apiToken: string,
		autoRefreshToken?: boolean,

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
	} );

}

export class GoogleMapsOverlay extends ImageOverlay {

	constructor( options: {
		apiToken: string,
		autoRefreshToken?: boolean,
		logoUrl?: string,
		sessionOptions?: null | { mapType: string, language: string, region: string },

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
	} );

}
