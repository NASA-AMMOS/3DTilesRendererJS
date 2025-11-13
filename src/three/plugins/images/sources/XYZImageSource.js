import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { TiledImageSource } from './TiledImageSource.js';

export class XYZImageSource extends TiledImageSource {

	constructor( options = {} ) {

		const {
			levels = 20,
			tileDimension = 256,
			url = null,
			...rest
		} = options;

		super( rest );

		this.tileDimension = tileDimension;
		this.levels = levels;
		this.url = url;

	}

	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*z\s*}/gi, level )
			.replace( /{\s*x\s*}/gi, x )
			.replace( /{\s*(y|reverseY|-\s*y)\s*}/gi, y );

	}

	init() {

		// transform the url
		const { tiling, tileDimension, levels, url } = this;

		tiling.flipY = ! /{\s*reverseY|-\s*y\s*}/g.test( url );
		tiling.setProjection( new ProjectionScheme( 'EPSG:3857' ) );
		tiling.setContentBounds( ...tiling.projection.getBounds() );
		tiling.generateLevels( levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
		} );

		this.url = url;

		return Promise.resolve();

	}

}
