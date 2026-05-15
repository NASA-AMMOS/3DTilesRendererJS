import { MVTContentCache, MVTImageSource } from './MVTImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { PMTiles } from 'pmtiles';

const DEG2RAD = Math.PI / 180;

class PMTilesContentCache extends MVTContentCache {

	constructor( options = {} ) {

		super( options );
		this.instance = null;

	}

	async init() {

		const { tiling, tileDimension } = this;

		this.instance = new PMTiles( this.url );

		const header = await this.instance.getHeader();
		if ( header.tileType !== 1 ) {

			throw new Error( `PMTilesContentCache: expected MVT tile type (1), got ${ header.tileType }` );

		}

		const projection = new ProjectionScheme( 'EPSG:3857' );

		tiling.flipY = true;
		tiling.setProjection( projection );
		tiling.setContentBounds(
			DEG2RAD * header.minLon,
			DEG2RAD * header.minLat,
			DEG2RAD * header.maxLon,
			DEG2RAD * header.maxLat,
		);
		tiling.generateLevels( header.maxZoom + 1, projection.tileCountX, projection.tileCountY, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
			minLevel: header.minZoom,
		} );

	}

	async fetchTileBuffer( z, x, y, signal ) {

		const res = await this.instance.getZxy( z, x, y, signal );
		return res ? res.data : null;

	}

}

export class PMTilesImageSource extends MVTImageSource {

	constructor( options = {} ) {

		super( { ...options, contentCache: new PMTilesContentCache( options ) } );

	}

}
