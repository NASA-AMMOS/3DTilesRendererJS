import { ColorRepresentation } from 'three';

export class PMTilesPlugin {

	constructor( options: {
		url: string,
		tileDimension?: number,
		filter?: ( feature: any, layerName: string ) => boolean,
		styles?: { [ layerName: string ]: ColorRepresentation },

		center?: boolean,
		shape?: 'ellipsoid' | 'planar',
		endCaps?: boolean,
		useRecommendedSettings?: boolean,
	} );

}
