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
			case 'EPSG:4326':
				this.tileCountX = 2;
				this.tileCountY = 1;
				return;

			// mercator
			case 'EPSG:3857':
				this.tileCountX = 1;
				this.tileCountY = 1;
				return;

			default:
				throw new Error();

		}

	}

	convertProjectionToLatitude( v ) {

		if ( this.isMercator ) {

			// https://gis.stackexchange.com/questions/447421/convert-a-point-on-a-flat-2d-web-mercator-map-image-to-a-coordinate
			// TODO: support partial lat ranges here
			// const { minLat, maxLat } = this;
			const ratio = MathUtils.mapLinear( v, 0, 1, - 1, 1 );
			return 2 * Math.atan( Math.exp( ratio * Math.PI ) ) - Math.PI / 2;

		} else {

			return Math.mapLinear( v, 0, 1, - Math.PI / 2, Math.PI / 2 );

		}

	}

	convertProjectionToLongitude( v ) {

		return MathUtils.mapLinear( v, 0, 1, - Math.PI, Math.PI );

	}

	convertLatitudeToProjection( lat ) {

		if ( this.isMercator ) {

			// https://stackoverflow.com/questions/14329691/convert-latitude-longitude-point-to-a-pixels-x-y-on-mercator-projection
			const mercatorN = Math.log( Math.tan( ( Math.PI / 4 ) + ( lat / 2 ) ) );
			return ( 1 / 2 ) + ( 1 * mercatorN / ( 2 * Math.PI ) );

		} else {

			return Math.mapLinear( lat, - Math.PI / 2, Math.PI / 2, 0, 1 );

		}

	}

	convertLongitudeToProjection( lon ) {

		return ( lon + Math.PI ) / ( 2 * Math.PI );

	}

	getLongitudeDerivativeAtValue( value ) {

		return 2 * Math.PI;

	}

	getLatitudeDerivativeAtValue( value ) {

		const EPS = 1e-5;
		let yp = value - EPS;
		if ( yp < 0 ) {

			yp = value + EPS;

		}

		if ( this.isMercator ) {

			// TODO: why is this 2 * Math.PI rather than Math.PI?
			return Math.abs( this.convertProjectionToLatitude( value ) - this.convertProjectionToLatitude( yp ) ) / EPS;

		} else {

			return Math.PI;

		}

	}

}
