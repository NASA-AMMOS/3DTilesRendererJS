import { MathUtils } from 'three';

const DERIVATIVE_EPSILON = 1e-5;

// Equal Earth projection polynomial coefficients (Šavrič, Patterson, Jenny 2018), ported from
// d3-geo: https://github.com/d3/d3-geo/blob/main/src/projection/equalEarth.js
const EE_A1 = 1.340264;
const EE_A2 = - 0.081106;
const EE_A3 = 0.000893;
const EE_A4 = 0.003796;
const EE_M = Math.sqrt( 3 ) / 2;
const EE_NEWTON_EPSILON = 1e-12;
const EE_NEWTON_ITERATIONS = 12;

// forward equal earth projection of a cartographic point on the unit sphere
function equalEarthProject( lon, lat, target ) {

	const l = Math.asin( EE_M * Math.sin( lat ) );
	const l2 = l * l;
	const l6 = l2 * l2 * l2;
	target[ 0 ] = lon * Math.cos( l ) / ( EE_M * ( EE_A1 + 3 * EE_A2 * l2 + l6 * ( 7 * EE_A3 + 9 * EE_A4 * l2 ) ) );
	target[ 1 ] = l * ( EE_A1 + EE_A2 * l2 + l6 * ( EE_A3 + EE_A4 * l2 ) );

	return target;

}

// inverse equal earth projection, solving the parametric latitude with newton iteration
function equalEarthUnproject( x, y, target ) {

	let l = y;
	let l2 = l * l;
	let l6 = l2 * l2 * l2;
	for ( let i = 0; i < EE_NEWTON_ITERATIONS; i ++ ) {

		const fy = l * ( EE_A1 + EE_A2 * l2 + l6 * ( EE_A3 + EE_A4 * l2 ) ) - y;
		const fpy = EE_A1 + 3 * EE_A2 * l2 + l6 * ( 7 * EE_A3 + 9 * EE_A4 * l2 );
		const delta = fy / fpy;
		l -= delta;
		l2 = l * l;
		l6 = l2 * l2 * l2;

		if ( Math.abs( delta ) < EE_NEWTON_EPSILON ) {

			break;

		}

	}

	target[ 0 ] = EE_M * x * ( EE_A1 + 3 * EE_A2 * l2 + l6 * ( 7 * EE_A3 + 9 * EE_A4 * l2 ) ) / Math.cos( l );
	target[ 1 ] = Math.asin( Math.sin( l ) / EE_M );

	return target;

}

// extents of the projected equal earth plane on the unit sphere
const EE_MAX_X = equalEarthProject( Math.PI, 0, [ 0, 0 ] )[ 0 ];
const EE_MAX_Y = equalEarthProject( 0, Math.PI / 2, [ 0, 0 ] )[ 1 ];

const _point = [ 0, 0 ];
const _derivPoint = [ 0, 0 ];

// Class for storing and querying a certain projection scheme for an image and converting
// between the [0, 1] image range to cartographic longitude / latitude values.
export class ProjectionScheme {

	get isMercator() {

		return this.scheme === 'EPSG:3857';

	}

	get isCartographic() {

		return this.scheme !== 'none';

	}

	constructor( scheme = 'EPSG:4326' ) {

		this.scheme = scheme;
		this.tileCountX = 1;
		this.tileCountY = 1;

		this.setScheme( scheme );

	}

	setScheme( scheme ) {

		this.scheme = scheme;
		switch ( scheme ) {

			// equirect
			case 'CRS:84':
			case 'EPSG:4326':
				this.tileCountX = 2;
				this.tileCountY = 1;
				break;

			// mercator
			case 'EPSG:3857':
				this.tileCountX = 1;
				this.tileCountY = 1;
				break;

			// equal earth
			case 'EPSG:8857':
				this.tileCountX = 1;
				this.tileCountY = 1;
				break;

			case 'none':
				this.tileCountX = 1;
				this.tileCountY = 1;
				break;

			default:
				throw new Error( `ProjectionScheme: Unknown projection scheme "${ scheme }"` );

		}

	}

	// per-axis derivative of the cartographic values at the given normalized point, evaluated
	// with a central difference sampling inward at the bounds
	getDerivativeAtNormalizedPoint( x, y, target = [ 0, 0 ] ) {

		const minX = Math.max( x - DERIVATIVE_EPSILON, 0 );
		const maxX = Math.min( x + DERIVATIVE_EPSILON, 1 );
		const minY = Math.max( y - DERIVATIVE_EPSILON, 0 );
		const maxY = Math.min( y + DERIVATIVE_EPSILON, 1 );

		const lon0 = this.fromNormalizedToCartographic( minX, y, _derivPoint )[ 0 ];
		const lon1 = this.fromNormalizedToCartographic( maxX, y, _derivPoint )[ 0 ];
		target[ 0 ] = Math.abs( lon1 - lon0 ) / ( maxX - minX );

		const lat0 = this.fromNormalizedToCartographic( x, minY, _derivPoint )[ 1 ];
		const lat1 = this.fromNormalizedToCartographic( x, maxY, _derivPoint )[ 1 ];
		target[ 1 ] = Math.abs( lat1 - lat0 ) / ( maxY - minY );

		return target;

	}

	getBounds() {

		if ( this.scheme === 'none' ) {

			return [ 0, 0, 1, 1 ];

		} else {

			// evaluated along the central axes so non-separable schemes report their full extent
			return [
				this.fromNormalizedToCartographic( 0, 0.5, _point )[ 0 ], this.fromNormalizedToCartographic( 0.5, 0, _point )[ 1 ],
				this.fromNormalizedToCartographic( 1, 0.5, _point )[ 0 ], this.fromNormalizedToCartographic( 0.5, 1, _point )[ 1 ],
			];

		}

	}

	fromCartographicToNormalized( x, y, target = [ 0, 0 ] ) {

		switch ( this.scheme ) {

			case 'none':
				target[ 0 ] = x;
				target[ 1 ] = y;
				break;

			case 'EPSG:3857': {

				// https://stackoverflow.com/questions/14329691/convert-latitude-longitude-point-to-a-pixels-x-y-on-mercator-projection
				const mercatorN = Math.log( Math.tan( ( Math.PI / 4 ) + ( y / 2 ) ) );
				target[ 0 ] = ( x + Math.PI ) / ( 2 * Math.PI );
				target[ 1 ] = ( 1 / 2 ) + ( 1 * mercatorN / ( 2 * Math.PI ) );
				break;

			}

			case 'EPSG:8857':
				equalEarthProject( x, y, target );
				target[ 0 ] = MathUtils.mapLinear( target[ 0 ], - EE_MAX_X, EE_MAX_X, 0, 1 );
				target[ 1 ] = MathUtils.mapLinear( target[ 1 ], - EE_MAX_Y, EE_MAX_Y, 0, 1 );
				break;

			// equirect
			default:
				target[ 0 ] = ( x + Math.PI ) / ( 2 * Math.PI );
				target[ 1 ] = MathUtils.mapLinear( y, - Math.PI / 2, Math.PI / 2, 0, 1 );

		}

		return target;

	}

	fromCartographicToNormalizedRange( range ) {

		return [
			...this.fromCartographicToNormalized( range[ 0 ], range[ 1 ] ),
			...this.fromCartographicToNormalized( range[ 2 ], range[ 3 ] ),
		];

	}

	fromNormalizedToCartographic( x, y, target = [ 0, 0 ] ) {

		switch ( this.scheme ) {

			case 'none':
				target[ 0 ] = x;
				target[ 1 ] = y;
				break;

			case 'EPSG:3857': {

				// https://gis.stackexchange.com/questions/447421/convert-a-point-on-a-flat-2d-web-mercator-map-image-to-a-coordinate
				const ratio = MathUtils.mapLinear( y, 0, 1, - 1, 1 );
				target[ 0 ] = MathUtils.mapLinear( x, 0, 1, - Math.PI, Math.PI );
				target[ 1 ] = 2 * Math.atan( Math.exp( ratio * Math.PI ) ) - Math.PI / 2;
				break;

			}

			case 'EPSG:8857':
				equalEarthUnproject(
					MathUtils.mapLinear( x, 0, 1, - EE_MAX_X, EE_MAX_X ),
					MathUtils.mapLinear( y, 0, 1, - EE_MAX_Y, EE_MAX_Y ),
					target,
				);
				break;

			// equirect
			default:
				target[ 0 ] = MathUtils.mapLinear( x, 0, 1, - Math.PI, Math.PI );
				target[ 1 ] = MathUtils.mapLinear( y, 0, 1, - Math.PI / 2, Math.PI / 2 );

		}

		return target;

	}

	fromNormalizedToCartographicRange( range ) {

		return [
			...this.fromNormalizedToCartographic( range[ 0 ], range[ 1 ] ),
			...this.fromNormalizedToCartographic( range[ 2 ], range[ 3 ] ),
		];

	}

	// span of the projected plane over the projection bounds for a unit sphere, in projection units
	getProjectedExtents() {

		switch ( this.scheme ) {

			case 'EPSG:3857':
				return [ 2 * Math.PI, 2 * Math.PI ];

			// equal earth
			case 'EPSG:8857':
				return [ 2 * EE_MAX_X, 2 * EE_MAX_Y ];

			case 'none':
				return [ 1, 1 ];

			default:
				return [ 2 * Math.PI, Math.PI ];

		}

	}

	clampToBounds( range, normalized = false ) {

		const result = [ ...range ];
		let clampBounds;

		if ( normalized ) {

			clampBounds = [ 0, 0, 1, 1 ];

		} else {

			clampBounds = this.getBounds();

		}

		const [ minX, minY, maxX, maxY ] = clampBounds;
		result[ 0 ] = MathUtils.clamp( result[ 0 ], minX, maxX );
		result[ 2 ] = MathUtils.clamp( result[ 2 ], minX, maxX );
		result[ 1 ] = MathUtils.clamp( result[ 1 ], minY, maxY );
		result[ 3 ] = MathUtils.clamp( result[ 3 ], minY, maxY );

		return result;

	}

}
