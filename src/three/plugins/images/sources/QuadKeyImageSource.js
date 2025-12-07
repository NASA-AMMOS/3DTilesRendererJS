import { XYZImageSource } from './XYZImageSource.js';

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
		this.subDomainIndex = 0;

	}

	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*subdomain\s*}/gi, this._getSubdomain() )
			.replace( /{\s*quadkey\s*}/gi, this._tileToQuadKey( x, y, level ) );

	}

	_tileToQuadKey( x, y, level ) {

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

	_getSubdomain() {

		// Spread requests among different subdomains to circumvent browser URL request limits per domain
		// https://learn.microsoft.com/en-us/bingmaps/rest-services/directly-accessing-the-bing-maps-tiles
		this.subDomainIndex = ( this.subDomainIndex + 1 ) % this.subdomains.length;
		return this.subdomains[ this.subDomainIndex ];

	}

}
