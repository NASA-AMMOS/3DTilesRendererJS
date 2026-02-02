import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';
import { PMTilesImageSource } from './sources/PMTilesImageSource.js';
import { PMTilesLoaderBase } from '../../../core/renderer/loaders/PMTilesLoaderBase.js';

export class PMTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		super( options );

		this.name = 'PMTILES_PLUGIN';
		this.imageSource = new PMTilesImageSource( options );

	}

	// Intercept pmtiles:// URLs and fetch from the PMTiles archive
	fetchData( url, options ) {

		if ( url.startsWith( 'pmtiles://' ) ) {

			const { z, x, y } = PMTilesLoaderBase.parseUrl( url );

			return this.imageSource.pmtilesLoader.getTile( z, x, y, options?.signal )
				.then( buffer => buffer || new ArrayBuffer( 0 ) );

		}

		return null;

	}

}
