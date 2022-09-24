import { Vector3, Spherical, MathUtils } from 'three';

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

function swapFrame( target ) {

	const { x, y, z } = target;
	target.x = z;
	target.y = x;
	target.z = y;

}

export function sphericalPhiToLatitude( phi ) {

	return - ( phi - Math.PI / 2 );

}

export function latitudeToSphericalPhi( latitude ) {

	return - latitude + Math.PI / 2;

}

const _spherical = new Spherical();
const _norm = new Vector3();
const _vec = new Vector3();

// https://en.wikipedia.org/wiki/World_Geodetic_System
// https://en.wikipedia.org/wiki/Flattening
export const WGS84_RADIUS = 6378137;
export const WGS84_FLATTENING = 1 / 298.257223563;
export const WGS84_HEIGHT = - ( WGS84_FLATTENING * WGS84_RADIUS - WGS84_RADIUS );

export class Ellipsoid {

	constructor( x, y, z ) {

		this.radius = new Vector3( x, y, z );

	}

	getCartographicToPosition( lat, lon, target ) {

		// https://github.com/CesiumGS/cesium/blob/main/Source/Core/Ellipsoid.js#L396
		const radius = this.radius;
		_spherical.set( 1, latitudeToSphericalPhi( lat ), lon );
		_norm.setFromSpherical( _spherical ).normalize();

		swapFrame( _norm );

		_vec.copy( _norm );
		_vec.x *= radius.x ** 2;
		_vec.y *= radius.y ** 2;
		_vec.z *= radius.z ** 2;

		const gamma = Math.sqrt( _norm.dot( _vec ) );
		_vec.divideScalar( gamma );

		return target.copy( _vec );

	}

	getCartographicToNormal( lat, lon, target ) {

		_spherical.set( 1, ( - lat + Math.PI / 2 ), lon );
		target.setFromSpherical( _spherical ).normalize();

		swapFrame( target );
		return target;

	}

	getPositionToNormal( pos, target ) {

		const radius = this.radius;
		target.copy( pos );
		target.x /= radius.x ** 2;
		target.y /= radius.y ** 2;
		target.z /= radius.z ** 2;
		target.normalize();

		return target;

	}

}
