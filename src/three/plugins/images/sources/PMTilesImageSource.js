import { MVTImageSource } from './MVTImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { PMTilesLoaderBase } from '../../../../core/renderer/loaders/PMTilesLoaderBase.js';

export class PMTilesImageSource extends MVTImageSource {

	constructor( options = {} ) {

		super( options );

		this.pmtilesLoader = new PMTilesLoaderBase();
		this.tiling.flipY = true;

	}

	// Expose for backward compatibility
	get pmtilesUrl() {

		return this.pmtilesLoader.url;

	}

	get instance() {

		return this.pmtilesLoader.instance;

	}

	getUrl( x, y, level ) {

		return this.pmtilesLoader.getUrl( level, x, y );

	}

	async init() {

		const header = await this.pmtilesLoader.init( this.url );
		this.tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		this.tiling.generateLevels( header.maxZoom, this.tiling.projection.tileCountX, this.tiling.projection.tileCountY, {
			tilePixelWidth: this.tileDimension,
			tilePixelHeight: this.tileDimension,
		} );

	}

	// Override fetchItem to fetch directly from PMTiles archive (bypasses plugin fetchData chain)
	fetchItem( tokens, signal ) {

		const [ x, y, level ] = tokens;

		return this.pmtilesLoader.getTile( level, x, y, signal )
			.then( buffer => {

				if ( ! buffer ) {

					return this._createEmptyTexture();

				}

				return this.processBufferToTexture( buffer );

			} );

	}

}
