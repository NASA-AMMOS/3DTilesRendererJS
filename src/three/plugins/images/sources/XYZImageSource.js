import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { TiledImageSource } from './TiledImageSource.js';

export class XYZImageSource extends TiledImageSource {

	constructor( options = {} ) {

		super();

		const {
			levels = 20,
			tileDimension = 256,
			projection = 'EPSG:3857',
		} = options;

		this.tileDimension = tileDimension;
		this.levels = levels;
		this.projection = projection;
		this.url = null;

	}

	getUrl( x, y, level ) {

		console.log
		return this.url
			.replace( /{\s*z\s*}/gi, level )
			.replace( /{\s*x\s*}/gi, x )
			.replace( /{\s*(y|reverseY|-\s*y)\s*}/gi, y );

	}

	init( url ) {

		// transform the url
		const { tiling, tileDimension, levels } = this;

		tiling.flipY = /{\s*reverseY\s*}|{\s*-\s*y\s*}/g.test( this.url );
		tiling.setProjection( new ProjectionScheme( this.projection ) );
		tiling.generateLevels( levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
		} );

		this.url = url;

		return Promise.resolve();

	}

}
