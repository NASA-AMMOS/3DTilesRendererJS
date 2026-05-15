import { MVTContentCache, MVTImageSource } from './MVTImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { PMTiles } from 'pmtiles';

class PMTilesContentCache extends MVTContentCache {

	constructor( options = {} ) {

		super( options );
		this._pmtiles = null;

	}

	async init() {

		this._pmtiles = new PMTiles( this.url );
		const header = await this._pmtiles.getHeader();
		this.tiling.flipY = true;
		this.tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		this.tiling.generateLevels( header.maxZoom, this.tiling.projection.tileCountX, this.tiling.projection.tileCountY, {
			tilePixelWidth: this.tileDimension,
			tilePixelHeight: this.tileDimension,
		} );

	}

	async fetchTileBuffer( z, x, y, signal ) {

		const res = await this._pmtiles.getZxy( z, x, y, signal );
		return res ? res.data : null;

	}

}

export class PMTilesImageSource extends MVTImageSource {

	constructor( options = {} ) {

		super( { ...options, contentCache: new PMTilesContentCache( options ) } );

	}

}
