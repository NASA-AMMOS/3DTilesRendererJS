import { VectorTileStyler } from '../../../three/renderer/utils/VectorTileStyler.js';

export interface FeatureIteratorResult {
	feature: any;
	layerName: string;
	layer: any;
	geometry: any[];
	type: number;
}

export class VectorTileIterator {

	styler: VectorTileStyler;

	constructor( styler: VectorTileStyler );

	iterateFeatures( vectorTile: any ): Generator<FeatureIteratorResult>;

}
