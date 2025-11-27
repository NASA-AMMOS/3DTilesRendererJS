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

// Bing Maps Tile System
// https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system
export class QuadKeyImageSource extends XYZImageSource {

	constructor( options = {} ) {

		const {
			subdomains = [ 't0' ],
			...rest
		} = options;

		super( rest );

		this.subdomains = subdomains;

	}

	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*subdomain\s*}/gi, this._getSubdomain() )
			.replace( /{\s*quadkey\s*}/gi, this._tileToQuadKey( x, y, level ) );

	}

	_tileToQuadKey( x, y, level ) {

		// zoom level 0 does not exist for QuadKey
		if ( level === 0 ) return '0';

		let quadKey = '';
		for ( let i = level; i > 0; i -- ) {

			let digit = 0;
			const mask = 1 << ( i - 1 );
			if ( ( x & mask ) !== 0 ) digit += 1;
			if ( ( y & mask ) !== 0 ) digit += 2;
			quadKey += digit.toString();

		}

		return quadKey;

	}

	// Get random subdomain
	_getSubdomain() {

		return this.subdomains[ Math.floor( Math.random() * this.subdomains.length ) ];

	}

}
