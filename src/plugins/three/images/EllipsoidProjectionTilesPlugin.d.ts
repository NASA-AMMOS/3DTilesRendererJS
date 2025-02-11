
export class XYZTilesPlugin {

	constructor( options: {
		center?: boolean,
		pixelSize?: number,
		levels?: number,
		tileDimension?: number,
		projection?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
	} );

}

export class TMSTilesPlugin {

	constructor( options: {
		center?: boolean,
		pixelSize?: number,
		projection?: 'ellipsoid' | 'planar',
		useRecommendedSettings?: boolean,
	} );

}
