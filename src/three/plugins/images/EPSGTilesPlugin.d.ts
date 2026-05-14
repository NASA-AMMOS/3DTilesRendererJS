import { WMTSTileMatrix } from '../loaders/WMTSCapabilitiesLoader.js';

export class XYZTilesPlugin {

	constructor( options: {
		center?: boolean,
		levels?: number|Array<object>,
		tileDimension?: number,
		shape?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
		url?: string,
	} );

}

export class TMSTilesPlugin {

	constructor( options: {
		center?: boolean,
		shape?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
		url?: string,
	} );

}

export class WMTSTilesPlugin {

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

		shape?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
	} );

}

export class WMSTilesPlugin {

	constructor( options: {
		layer: string,
		url?: string,
		levels?: number,
		crs: string,
		format?: string,
		tileDimension?: number,
		styles?: string,
		version?: string,
		transparent?: boolean,
		contentBoundingBox?: [ number, number, number, number ],

		center?: boolean,
		shape?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
	} );

}
