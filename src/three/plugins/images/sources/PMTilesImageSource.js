import { MVTContentCache, MVTImageSource } from './MVTImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { PMTilesLoaderBase } from '../../../../core/renderer/loaders/PMTilesLoaderBase.js';

class PMTilesContentCache extends MVTContentCache {

	constructor( options = {} ) {

		super( options );
		this.pmtilesLoader = new PMTilesLoaderBase();

	}

	async init() {

		const header = await this.pmtilesLoader.init( this.url );
		this.tiling.flipY = true;
		this.tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		this.tiling.generateLevels( header.maxZoom, this.tiling.projection.tileCountX, this.tiling.projection.tileCountY, {
			tilePixelWidth: this.tileDimension,
			tilePixelHeight: this.tileDimension,
		} );

	}

	async fetchTileBuffer( z, x, y, signal ) {

		return this.pmtilesLoader.getTile( z, x, y, signal );

	}

}

export class PMTilesImageSource extends MVTImageSource {

	constructor( options = {} ) {

		super( { ...options, contentCache: new PMTilesContentCache( options ) } );

	}

}
