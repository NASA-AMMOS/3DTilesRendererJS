
export class XYZTilesPlugin {

	constructor( options: {
		center?: boolean,
		levels?: number,
		tileDimension?: number,
		shape?: 'ellipsoid' | 'planar',
		bounds?: [ number, number, number, number ],
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
		center?: boolean,
		levels?: number,
		tileDimension?: number,
		shape?: 'ellipsoid' | 'planar',
		bounds?: [ number, number, number, number ],
		useRecommendedSettings?: boolean,
	} );

}

export class WMSTilesPlugin {

	constructor( options: {

		center?: boolean,
		shape?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
		url?: string,
		layer: string,
		crs: string,
		crsParam?: string,
		format?: string,
		tileDimension?: number,
		styles?: string,
		version?: string,
		bounds?: [ number, number, number, number ],
		extraHeaders?:{ [key: string]: string}

	} );

}
