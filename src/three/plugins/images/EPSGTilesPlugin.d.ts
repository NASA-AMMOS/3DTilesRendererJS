
export class XYZTilesPlugin {

	constructor( options: {
		center?: boolean,
		levels?: number,
		tileDimension?: number,
		projection?: 'ellipsoid' | 'planar',
		bounds?: [ number, number, number, number ],
		useRecommendedSettings?: boolean,
	} );

}

export class TMSTilesPlugin {

	constructor( options: {
		center?: boolean,
		projection?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
	} );

}

export class WMTSTilesPlugin {

	constructor( options: {
		center?: boolean,
		levels?: number,
		tileDimension?: number,
		projection?: 'ellipsoid' | 'planar',
		bounds?: [ number, number, number, number ],
		useRecommendedSettings?: boolean,
	} );

}
