import { MVTImageSource } from './MVTImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { PMTilesLoaderBase } from '../../../../core/renderer/loaders/PMTilesLoaderBase.js';

export class PMTilesImageSource extends MVTImageSource {

	constructor( options = {} ) {

		super( options );

		this.pmtilesLoader = new PMTilesLoaderBase();
		this.tiling.flipY = true;

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

}
