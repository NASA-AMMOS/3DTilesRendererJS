// MVT File Format
// https://github.com/mapbox/vector-tile-spec/blob/master/2.1/README.md

import { LoaderBase } from './LoaderBase.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

export class MVTLoaderBase extends LoaderBase {

	parse(buffer) {
		const vectorTile = new VectorTile(new Protobuf(buffer));
		return Promise.resolve({ vectorTile });
	}

}

