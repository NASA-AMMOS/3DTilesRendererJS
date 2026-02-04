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

		this.url = url;
		this.instance = new PMTiles( url );
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

	// Parse tile coordinates from a virtual URL (pmtiles://z/x/y)
	static parseUrl( url ) {

		const i2 = url.lastIndexOf( '/' );
		const i1 = url.lastIndexOf( '/', i2 - 1 );
		const i0 = url.lastIndexOf( '/', i1 - 1 );

		return {
			z: parseInt( url.slice( i0 + 1, i1 ) ),
			x: parseInt( url.slice( i1 + 1, i2 ) ),
			y: parseInt( url.slice( i2 + 1 ) ),
		};

	}

}
