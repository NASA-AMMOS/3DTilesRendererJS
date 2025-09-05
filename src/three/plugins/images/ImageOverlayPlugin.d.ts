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

export class GeoJSONTilesOverlay extends ImageOverlay {

	constructor( options: {
		// rasterize GeoJSON per tile (forwarded to GeoJSONImageSource)
		geojson?: any, // FeatureCollection or null (if url provided)
		url?: string, // optional URL alternative to geojson object
		tileDimension?: number, // tile size in px (runtime name: tileDimension)
		levels?: number, // max rasterization zoom
		bounds?: [ number, number, number, number ],
		projection?: string, // 'EPSG:3857' or 'EPSG:4326'
		pointRadius?: number,
		strokeStyle?: string,
		fillStyle?: string,
		color?: number | Color,
		opacity?: number,
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
		sessionOptions: { mapType: string, language: string, region: string, [key: string]: any },

		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
	} );

}
