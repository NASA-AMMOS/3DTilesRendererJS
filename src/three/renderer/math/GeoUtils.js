import { Spherical, Vector3, MathUtils } from 'three';

const _spherical = new Spherical();
const _vec = new Vector3();
const _geoResults = {};

// Cesium / 3D tiles Spheroid:
// - Up is Z at 90 degrees latitude
// - 0, 0 latitude, longitude is X axis
//      Z
//      |
//      |
//      .----- Y
//     /
//   X


// Three.js Spherical Coordinates
// - Up is Y at 90 degrees latitude
// - 0, 0 latitude, longitude is Z
//       Y
//      |
//      |
//      .----- X
//     /
//   Z

export function swapToGeoFrame( target ) {

	const { x, y, z } = target;
	target.x = z;
	target.y = x;
	target.z = y;

}

export function swapToThreeFrame( target ) {

	const { x, y, z } = target;
	target.z = x;
	target.x = y;
	target.y = z;

}

export function sphericalPhiToLatitude( phi ) {

	return - ( phi - Math.PI / 2 );

}

export function latitudeToSphericalPhi( latitude ) {

	return - latitude + Math.PI / 2;

}

function correctGeoCoordWrap( lat, lon, target = {} ) {

	_spherical.theta = lon;
	_spherical.phi = latitudeToSphericalPhi( lat );
	_vec.setFromSpherical( _spherical );

	_spherical.setFromVector3( _vec );
	target.lat = sphericalPhiToLatitude( _spherical.phi );
	target.lon = _spherical.theta;
	return target;

}

function toHoursMinutesSecondsString( value, pos = 'E', neg = 'W' ) {

	const direction = value < 0 ? neg : pos;
	value = Math.abs( value );

	const hours = ~ ~ value;

	const minDec = ( value - hours ) * 60;
	const minutes = ~ ~ minDec;

	const secDec = ( minDec - minutes ) * 60;
	const seconds = ~ ~ secDec;

	return `${ hours }° ${ minutes }' ${ seconds }" ${ direction }`;

}

export function toLatLonString( lat, lon, decimalFormat = false ) {

	const result = correctGeoCoordWrap( lat, lon, _geoResults );
	let latString, lonString;
	if ( decimalFormat ) {

		latString = `${ ( MathUtils.RAD2DEG * result.lat ).toFixed( 4 ) }°`;
		lonString = `${ ( MathUtils.RAD2DEG * result.lon ).toFixed( 4 ) }°`;

	} else {

		latString = toHoursMinutesSecondsString( MathUtils.RAD2DEG * result.lat, 'N', 'S' );
		lonString = toHoursMinutesSecondsString( MathUtils.RAD2DEG * result.lon, 'E', 'W' );

	}

	return `${ latString } ${ lonString }`;

}
