import { MathUtils } from 'three';

const DERIVATIVE_EPSILON = 1e-5;

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

			case 'none':
				this.tileCountX = 1;
				this.tileCountY = 1;
				break;

			default:
				throw new Error( `ProjectionScheme: Unknown projection scheme "${ scheme }"` );

		}

	}

	// The per-axis conversions are evaluated through the point functions along the projection's
	// central axes. Non-separable schemes are only exact through the point functions.
	// TODO: remove these single-axis functions in favor of the point functions
	convertNormalizedToLatitude( v ) {

		return this.toCartographicPoint( 0.5, v, _point )[ 1 ];

	}

	convertNormalizedToLongitude( v ) {

		return this.toCartographicPoint( v, 0.5, _point )[ 0 ];

	}

	convertLatitudeToNormalized( lat ) {

		return this.toNormalizedPoint( 0, lat, _point )[ 1 ];

	}

	convertLongitudeToNormalized( lon ) {

		return this.toNormalizedPoint( lon, 0, _point )[ 0 ];

	}

	// per-axis derivative of the cartographic values at the given normalized point, evaluated
	// with a central difference sampling inward at the bounds
	getDerivativeAtNormalizedPoint( x, y, target = [ 0, 0 ] ) {

		const minX = Math.max( x - DERIVATIVE_EPSILON, 0 );
		const maxX = Math.min( x + DERIVATIVE_EPSILON, 1 );
		const minY = Math.max( y - DERIVATIVE_EPSILON, 0 );
		const maxY = Math.min( y + DERIVATIVE_EPSILON, 1 );

		const lon0 = this.toCartographicPoint( minX, y, _derivPoint )[ 0 ];
		const lon1 = this.toCartographicPoint( maxX, y, _derivPoint )[ 0 ];
		target[ 0 ] = Math.abs( lon1 - lon0 ) / ( maxX - minX );

		const lat0 = this.toCartographicPoint( x, minY, _derivPoint )[ 1 ];
		const lat1 = this.toCartographicPoint( x, maxY, _derivPoint )[ 1 ];
		target[ 1 ] = Math.abs( lat1 - lat0 ) / ( maxY - minY );

		return target;

	}

	// TODO: remove these single-axis functions in favor of "getDerivativeAtNormalizedPoint"
	getLongitudeDerivativeAtNormalized( value ) {

		return this.getDerivativeAtNormalizedPoint( value, 0.5, _point )[ 0 ];

	}

	getLatitudeDerivativeAtNormalized( value ) {

		return this.getDerivativeAtNormalizedPoint( 0.5, value, _point )[ 1 ];

	}

	getBounds() {

		if ( this.scheme === 'none' ) {

			return [ 0, 0, 1, 1 ];

		} else {

			return [
				this.convertNormalizedToLongitude( 0 ), this.convertNormalizedToLatitude( 0 ),
				this.convertNormalizedToLongitude( 1 ), this.convertNormalizedToLatitude( 1 ),
			];

		}

	}

	toNormalizedPoint( x, y, target = [ 0, 0 ] ) {

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

			// equirect
			default:
				target[ 0 ] = ( x + Math.PI ) / ( 2 * Math.PI );
				target[ 1 ] = MathUtils.mapLinear( y, - Math.PI / 2, Math.PI / 2, 0, 1 );

		}

		return target;

	}

	toNormalizedRange( range ) {

		return [
			...this.toNormalizedPoint( range[ 0 ], range[ 1 ] ),
			...this.toNormalizedPoint( range[ 2 ], range[ 3 ] ),
		];

	}

	toCartographicPoint( x, y, target = [ 0, 0 ] ) {

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

			// equirect
			default:
				target[ 0 ] = MathUtils.mapLinear( x, 0, 1, - Math.PI, Math.PI );
				target[ 1 ] = MathUtils.mapLinear( y, 0, 1, - Math.PI / 2, Math.PI / 2 );

		}

		return target;

	}

	toCartographicRange( range ) {

		return [
			...this.toCartographicPoint( range[ 0 ], range[ 1 ] ),
			...this.toCartographicPoint( range[ 2 ], range[ 3 ] ),
		];

	}

	// span of the projected plane over the projection bounds for a unit sphere, in projection units
	getProjectedExtents() {

		switch ( this.scheme ) {

			case 'EPSG:3857':
				return [ 2 * Math.PI, 2 * Math.PI ];

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
