
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
