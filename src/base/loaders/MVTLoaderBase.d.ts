

import { VectorTile } from '@mapbox/vector-tile';

export type MVTBaseResult = {
	vectorTile: VectorTile
};

export class MVTLoaderBase {

	load(url: string): Promise<MVTBaseResult>;
	parse(buffer: ArrayBuffer): Promise<MVTBaseResult>;

}
