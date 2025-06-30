import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { TiledImageSource } from './TiledImageSource.js';

export class XYZImageSource extends TiledImageSource {

	constructor( options = {} ) {

		super();

		const {
			levels = 20,
			tileDimension = 256,
		} = options;

		this.tileDimension = tileDimension;
		this.levels = levels;
		this.url = null;

	}

	getUrl( x, y, level ) {

		return this.url.replace( '{z}', level ).replace( '{x}', x ).replace( '{y}', y );

	}

	init( url ) {

		// transform the url
		const { tiling, tileDimension, levels } = this;

		tiling.flipY = true;
		tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		tiling.generateLevels( levels, 1, 1, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
		} );

		this.url = url;

		return Promise.resolve();

	}

}
