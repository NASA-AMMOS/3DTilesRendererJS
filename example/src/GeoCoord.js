import { MathUtils, Spherical, Vector3 } from 'three';
import { swapToGeoFrame, swapToThreeFrame, sphericalPhiToLatitude, latitudeToSphericalPhi } from './GeoUtils.js';

function getHoursMinutesSeconds( value, pos = 'E', neg = 'W' ) {

	const direction = value < 0 ? neg : pos;
	value = Math.abs( value );

	const hours = ~ ~ value;

	const minDec = ( value - hours ) * 60;
	const minutes = ~ ~ minDec;

	const secDec = ( minDec - minutes ) * 60;
	const seconds = ~ ~ secDec;

	return `${ hours }° ${ minutes }' ${ seconds }" ${ direction }`


}

// lat = [ -90, 90 ], lon = [ -180, 180 ]
const _vec = new Vector3();
const _spherical = new Spherical();
export class GeoCoord {

	constructor( lat = 0, lon = 0 ) {

		this.lat = lat;
		this.lon = lon;

	}

	fromSpherical( spherical ) {

		this.lon = spherical.theta;
		this.lat = sphericalPhiToLatitude( spherical.phi );
		return this;

	}

	getSpherical( target ) {

		target.theta = this.lon;
		target.phi = latitudeToSphericalPhi( this.lat );
		return this;

	}

	fromVector3( vector ) {

		swapToThreeFrame( vector );

		_spherical.setFromVector3( vector );
		this.fromSpherical( _spherical );
		return this;

	}

	getVector3( target ) {

		this.getSpherical( _spherical );
		target.setFromSpherical( _spherical );

		swapToGeoFrame( target );

		return this;

	}

	normalize() {

		this.getVector3( _vec );
		this.fromVector3( _vec );
		return this;

	}

	toLatitudeString() {

		return getHoursMinutesSeconds( MathUtils.RAD2DEG * this.lat, 'N', 'S' );

	}

	toLongitudeString() {

		return getHoursMinutesSeconds( MathUtils.RAD2DEG * this.lon, 'E', 'W' );

	}

	toString() {

		return `${ this.toLatitudeString() }, ${ this.toLongitudeString() }`;

	}

}
