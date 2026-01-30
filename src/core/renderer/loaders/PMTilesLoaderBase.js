// PMTiles Archive Format
// https://github.com/protomaps/PMTiles

import { PMTiles } from 'pmtiles';

export class PMTilesLoaderBase {

	constructor() {

		this.instance = null;
		this.header = null;
		this.url = null;

	}

	// Initialize the PMTiles archive and load header
	async init( url ) {

		this.url = url.replace( /^pmtiles:\/\//, '' );
		this.instance = new PMTiles( this.url );
		this.header = await this.instance.getHeader();

		return this.header;

	}

	// Fetch a tile from the archive
	async getTile( z, x, y, signal ) {

		if ( ! this.instance ) {

			throw new Error( 'PMTilesLoaderBase: Archive not initialized. Call init() first.' );

		}

		const res = await this.instance.getZxy( z, x, y, signal );

		if ( ! res || ! res.data ) {

			return null;

		}

		return res.data;

	}

	// Generate a virtual URL for a tile (used by tiling scheme)
	getUrl( z, x, y ) {

		return `pmtiles://${z}/${x}/${y}`;

	}

	// Parse tile coordinates from a virtual URL
	static parseUrl( url ) {

		const parts = url.split( '/' );
		const y = parseInt( parts.pop() );
		const x = parseInt( parts.pop() );
		const z = parseInt( parts.pop() );

		return { z, x, y };

	}

}
