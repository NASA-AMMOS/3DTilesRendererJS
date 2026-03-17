import { Spherical, Vector3, MathUtils } from 'three';

const _spherical = /* @__PURE__ */ new Spherical();
const _vec = /* @__PURE__ */ new Vector3();
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

/**
 * Swaps a Vector3 from the three.js coordinate frame to the geo/Cesium coordinate frame in-place.
 * @param {Vector3} target
 * @ignore
 */
export function swapToGeoFrame( target ) {

	const { x, y, z } = target;
	target.x = z;
	target.y = x;
	target.z = y;

}

/**
 * Swaps a Vector3 from the geo/Cesium coordinate frame to the three.js coordinate frame in-place.
 * @param {Vector3} target
 * @ignore
 */
export function swapToThreeFrame( target ) {

	const { x, y, z } = target;
	target.z = x;
	target.x = y;
	target.y = z;

}

/**
 * Converts a three.js spherical phi angle (polar angle from +Y axis, in radians) to a
 * geographic latitude (angle from the equator, in radians).
 * @param {number} phi
 * @returns {number}
 * @ignore
 */
export function sphericalPhiToLatitude( phi ) {

	return - ( phi - Math.PI / 2 );

}

/**
 * Converts a geographic latitude (angle from the equator, in radians) to a three.js
 * spherical phi angle (polar angle from +Y axis, in radians).
 * @param {number} latitude
 * @returns {number}
 * @ignore
 */
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
