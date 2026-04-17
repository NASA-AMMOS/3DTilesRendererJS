import { Color, Matrix4, WebGLRenderer } from 'three';
import { WMTSTileMatrix } from '../loaders/WMTSCapabilitiesLoader.js';

export class ImageOverlayPlugin {

	constructor( options: {
		overlays: Array<ImageOverlay>,
		renderer: WebGLRenderer,
		resolution?: number,
		enableTileSplitting?: boolean,
		alphaMask?: boolean,			// false = fade to the layer below, true = use only alpha to fade all layers underneath
		alphaInvert?: boolean, 			// false = cut inside (keep outside); true = cut outside (keep inside)
	} );

	addOverlay( overlay: ImageOverlay, order?: number ): void;
	setOverlayOrder( overlay: ImageOverlay, order?: number ): void;
	deleteOverlay( overlay: ImageOverlay ): void;

}

export class ImageOverlay {

	color: number | Color;
	opacity: number;
	frame: Matrix4 | null;
	preprocessURL: ( url: string ) => string | null;
	alphaMask: boolean;
	alphaInvert: boolean;
	isReady: boolean;
	readonly isPlanarProjection: boolean;

}

export class TiledImageOverlay extends ImageOverlay {

	readonly tiling: any;
	readonly projection: any;
	readonly aspectRatio: number;
	fetchOptions: any;

}

export class XYZTilesOverlay extends TiledImageOverlay {

	constructor( options: {
		url: string,
		levels?: number,
		tileDimension?: number,
		projection?: string;

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}

export class GeoJSONOverlay extends ImageOverlay {

	constructor( options: {
		geojson?: any, // FeatureCollection or null (if url provided)
		url?: string, // optional URL alternative to geojson object
		resolution?: number,
		pointRadius?: number,
		strokeStyle?: string,
		strokeWidth?: number,
		fillStyle?: string,

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}

export class WMSTilesOverlay extends TiledImageOverlay {

	constructor( options: {
		url: string,
		layer: string,
		crs?: string,
		format?: string,
		tileDimension?: number,
		styles?: string,
		version?: string,
		levels?: number,
		transparent?: boolean,
		contentBoundingBox?: [ number, number, number, number ],

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}

export class WMTSTilesOverlay extends TiledImageOverlay {

	constructor( options: {
		url?: string | null,
		layer?: string | null,
		tileMatrixSet?: string | null,
		style?: string,
		tileMatrixLabels?: Array<string>,
		tileMatrices: Array<WMTSTileMatrix>,
		dimensions?: { [ key: string ]: any } | null,
		projection?: string,
		levels?: number,
		tileDimension?: number,
		contentBoundingBox?: Array<number>,

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}

export class TMSTilesOverlay extends TiledImageOverlay {

	constructor( options: {
		url: string,

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}

export class CesiumIonOverlay extends TiledImageOverlay {

	constructor( options: {
		assetId: number | string,
		apiToken: string,
		autoRefreshToken?: boolean,

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}

export class GoogleMapsOverlay extends TiledImageOverlay {

	constructor( options: {
		apiToken: string,
		autoRefreshToken?: boolean,
		logoUrl?: string,
		sessionOptions: { mapType: string, language: string, region: string, [key: string]: any },

		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

}
