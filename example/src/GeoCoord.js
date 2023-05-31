import { Spherical, Vector3 } from 'three';

function sphericalPhiToLatitude( phi ) {

	return - ( phi - Math.PI / 2 );

}

function latitudeToSphericalPhi( latitude ) {

	return - latitude + Math.PI / 2;

}

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

	}

	getSpherical( target ) {

		target.theta = this.lon;
		target.phi = latitudeToSphericalPhi( this.lat );

	}

	normalize() {

		this.getSpherical( _spherical );
		_vec.setFromSpherical( _spherical );
		_spherical.setFromVector3( _vec );
		this.fromSpherical( _spherical );

	}

	getLatitudeString() {

		return getHoursMinutesSeconds( this.lat, 'E', 'W' );

	}

	getLongitudeString() {

		return getHoursMinutesSeconds( this.lon, 'N', 'S' );

	}

}
