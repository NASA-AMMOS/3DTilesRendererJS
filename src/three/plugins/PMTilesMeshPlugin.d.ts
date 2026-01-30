import { ColorRepresentation } from 'three';
import { PMTilesLoaderBase } from '../../core/renderer/loaders/PMTilesLoaderBase.js';

export class PMTilesMeshPlugin {

	readonly pmtilesLoader: PMTilesLoaderBase;

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
