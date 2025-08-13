
export class XYZTilesPlugin {

	constructor( options: {
		center?: boolean,
		levels?: number,
		tileDimension?: number,
		shape?: 'ellipsoid' | 'planar',
		bounds?: [ number, number, number, number ],
		useRecommendedSettings?: boolean,
	} );

}

export class TMSTilesPlugin {

	constructor( options: {
		center?: boolean,
		shape?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
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
