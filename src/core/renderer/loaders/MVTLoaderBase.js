// MVT File Format
// https://github.com/mapbox/vector-tile-spec/blob/master/2.1/README.md

import { LoaderBase } from './LoaderBase.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { DefaultLoadingManager } from 'three';

export const MVT_EXTENT = 4096;
export class MVTLoaderBase extends LoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		const pbf = new Protobuf( buffer );
		const vectorTile = new VectorTile( pbf );

		// Return a structure consistent with PNTSLoaderBase/B3DMLoaderBase
		return Promise.resolve( {
			vectorTile
		} );

	}

}
