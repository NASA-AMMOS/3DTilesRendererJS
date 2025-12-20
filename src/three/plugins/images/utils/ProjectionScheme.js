import { MathUtils } from 'three';

// Class for storing and querying a certain projection scheme for an image and converting
// between the [0, 1] image range to cartographic longitude / latitude values.
export class ProjectionScheme {

	get isMercator() {

		return this.scheme === 'EPSG:3857';

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

	convertNormalizedToLatitude( v ) {

		if ( this.scheme === 'none' ) {

			return v;

		} else if ( this.isMercator ) {

			// https://gis.stackexchange.com/questions/447421/convert-a-point-on-a-flat-2d-web-mercator-map-image-to-a-coordinate
			const ratio = MathUtils.mapLinear( v, 0, 1, - 1, 1 );
			return 2 * Math.atan( Math.exp( ratio * Math.PI ) ) - Math.PI / 2;

		} else {

			return MathUtils.mapLinear( v, 0, 1, - Math.PI / 2, Math.PI / 2 );

		}

	}

	convertNormalizedToLongitude( v ) {

		if ( this.scheme === 'none' ) {

			return v;

		} else {

			return MathUtils.mapLinear( v, 0, 1, - Math.PI, Math.PI );

		}

	}

	convertLatitudeToNormalized( lat ) {

		if ( this.scheme === 'none' ) {

			return lat;

		} else if ( this.isMercator ) {

			// https://stackoverflow.com/questions/14329691/convert-latitude-longitude-point-to-a-pixels-x-y-on-mercator-projection
			const mercatorN = Math.log( Math.tan( ( Math.PI / 4 ) + ( lat / 2 ) ) );
			return ( 1 / 2 ) + ( 1 * mercatorN / ( 2 * Math.PI ) );

		} else {

			return MathUtils.mapLinear( lat, - Math.PI / 2, Math.PI / 2, 0, 1 );

		}

	}

	convertLongitudeToNormalized( lon ) {

		if ( this.scheme === 'none' ) {

			return lon;

		} else {

			return ( lon + Math.PI ) / ( 2 * Math.PI );

		}

	}

	getLongitudeDerivativeAtNormalized( value ) {

		if ( this.scheme === 'none' ) {

			return 1;

		} else {

			return 2 * Math.PI;

		}

	}

	getLatitudeDerivativeAtNormalized( value ) {

		if ( this.scheme === 'none' ) {

			return 1;

		} else {

			const EPS = 1e-5;
			let yp = value - EPS;
			if ( yp < 0 ) {

				yp = value + EPS;

			}

			if ( this.isMercator ) {

				// TODO: why is this 2 * Math.PI rather than Math.PI?
				return Math.abs( this.convertNormalizedToLatitude( value ) - this.convertNormalizedToLatitude( yp ) ) / EPS;

			} else {

				return Math.PI;

			}

		}

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

	toNormalizedPoint( x, y ) {

		const result = [ x, y ];
		result[ 0 ] = this.convertLongitudeToNormalized( result[ 0 ] );
		result[ 1 ] = this.convertLatitudeToNormalized( result[ 1 ] );

		return result;

	}

	toNormalizedRange( range ) {

		return [
			...this.toNormalizedPoint( range[ 0 ], range[ 1 ] ),
			...this.toNormalizedPoint( range[ 2 ], range[ 3 ] ),
		];

	}

	toCartographicPoint( x, y ) {

		const result = [ x, y ];
		result[ 0 ] = this.convertNormalizedToLongitude( result[ 0 ] );
		result[ 1 ] = this.convertNormalizedToLatitude( result[ 1 ] );

		return result;

	}

	toCartographicRange( range ) {

		return [
			...this.toCartographicPoint( range[ 0 ], range[ 1 ] ),
			...this.toCartographicPoint( range[ 2 ], range[ 3 ] ),
		];

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
		result[ 1 ] = MathUtils.clamp( result[ 1 ], minY, maxY );
		result[ 2 ] = MathUtils.clamp( result[ 2 ], minX, maxX );
		result[ 3 ] = MathUtils.clamp( result[ 3 ], minY, maxY );

		return result;

	}

}
