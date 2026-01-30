import { MVTTilesMeshPlugin } from './MVTTilesMeshPlugin.js';
import { PMTilesLoaderBase } from '../../core/renderer/loaders/PMTilesLoaderBase.js';
import { ProjectionScheme } from './images/utils/ProjectionScheme.js';

export class PMTilesMeshPlugin extends MVTTilesMeshPlugin {

	constructor( options = {} ) {

		super( options );

		this.name = 'PMTILES_MESH_PLUGIN';
		this.pmtilesLoader = new PMTilesLoaderBase();
		this._pmtilesUrl = options.url;

	}

	async loadRootTileset() {

		// Initialize PMTiles and get header
		const header = await this.pmtilesLoader.init( this._pmtilesUrl );

		// Configure tiling from header
		this.imageSource.tiling.flipY = true;
		this.imageSource.tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		this.imageSource.tiling.generateLevels(
			header.maxZoom,
			this.imageSource.tiling.projection.tileCountX,
			this.imageSource.tiling.projection.tileCountY,
			{
				tilePixelWidth: this.imageSource.tileDimension,
				tilePixelHeight: this.imageSource.tileDimension,
			}
		);

		// Override getUrl to use pmtiles:// scheme
		this.imageSource.getUrl = ( x, y, level ) => this.pmtilesLoader.getUrl( level, x, y );

		return this.getTileset( this._pmtilesUrl );

	}

	// Intercept pmtiles:// URLs and fetch from the PMTiles archive
	fetchData( url, options ) {

		if ( url.startsWith( 'pmtiles://' ) ) {

			const { z, x, y } = PMTilesLoaderBase.parseUrl( url );

			return this.pmtilesLoader.getTile( z, x, y, options?.signal )
				.then( buffer => buffer || new ArrayBuffer( 0 ) );

		}

		return null;

	}

	// Override to handle pmtiles:// URLs (no file extension)
	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		// Handle pmtiles:// URLs OR standard .pbf/.mvt extensions
		if ( uri.startsWith( 'pmtiles://' ) || extension === 'pbf' || extension === 'mvt' ) {

			const result = await this.loader.parse( buffer );
			const group = result.scene;

			this._projectGroupToGlobe( group, tile );

			return group;

		}

		return null;

	}

}
