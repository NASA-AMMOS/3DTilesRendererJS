import { Color, Matrix4, WebGLRenderer } from 'three';
import { WMTSCapabilitiesResult, WMTSLayer, WMTSTileMatrixSet } from '../loaders/WMTSCapabilitiesLoader.js';

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
	fetchOptions: any;
	preprocessURL: ( url: string ) => string | null;

}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options: {
		levels: number,
		dimension: number,
		projection: string;
		url: string,

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

export class GeoJSONOverlay extends ImageOverlay {

	constructor( options: {
		// rasterize GeoJSON per tile (forwarded to GeoJSONImageSource)
		geojson?: any, // FeatureCollection or null (if url provided)
		url?: string, // optional URL alternative to geojson object
		tileDimension?: number, // tile size in px (runtime name: tileDimension)
		levels?: number, // max rasterization zoom
		pointRadius?: number,
		strokeStyle?: string,
		strokeWidth?: number,
		fillStyle?: string,
		color?: number | Color,
		opacity?: number,

		frame?: Matrix4 | null,

	} );

}

export class WMSTilesOverlay extends ImageOverlay {

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
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

export class WMTSTilesOverlay extends ImageOverlay {

	constructor( options: {
		dimensions?: { [ key: string ]: any } | null,
		url?: string | null,
		capabilities?: WMTSCapabilitiesResult | null,
		layer?: WMTSLayer | string | null,
		tileMatrixSet?: WMTSTileMatrixSet | string | null,
		style?: string,

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options: {
		url: string,

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
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
		preprocessURL?: ( url: string ) => string | null;
	} );

}

export class GoogleMapsOverlay extends ImageOverlay {

	constructor( options: {
		apiToken: string,
		autoRefreshToken?: boolean,
		logoUrl?: string,
		sessionOptions: { mapType: string, language: string, region: string, [key: string]: any },

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}
