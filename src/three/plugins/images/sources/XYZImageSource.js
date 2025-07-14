import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { TiledImageSource } from './TiledImageSource.js';

export class XYZImageSource extends TiledImageSource {

	constructor( options = {} ) {

		super();

		const {
			levels = 20,
			tileDimension = 256,
			projection = 'EPSG:3857',
			bounds = [ - Math.PI, - Math.PI / 2, Math.PI, Math.PI / 2 ],
		} = options;

		this.tileDimension = tileDimension;
		this.levels = levels;
		this.projection = projection;
		this.bounds = bounds;
		this.url = null;

	}

	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*z\s*}/gi, level )
			.replace( /{\s*x\s*}/gi, x )
			.replace( /{\s*(y|reverseY|-\s*y)\s*}/gi, y );

	}

	init( url ) {

		// transform the url
		const { tiling, tileDimension, levels, bounds, projection } = this;

		tiling.flipY = ! /{\s*reverseY|-\s*y\s*}/g.test( url );
		tiling.setProjection( new ProjectionScheme( projection ) );
		tiling.setBounds( ...bounds );
		tiling.generateLevels( levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
		} );

		this.url = url;

		return Promise.resolve();

	}

}
