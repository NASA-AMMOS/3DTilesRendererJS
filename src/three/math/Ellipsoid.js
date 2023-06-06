import { Vector3, Spherical } from 'three';

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
const _vec2 = new Vector3();

export class Ellipsoid {

	constructor( x = 1, y = 1, z = 1 ) {

		this.radius = new Vector3( x, y, z );

	}

	getCartographicToPosition( lat, lon, height, target ) {

		// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/Core/Ellipsoid.js#L396
		this.getCartographicToNormal( lat, lon, _norm );

		const radius = this.radius;
		_vec.copy( _norm );
		_vec.x *= radius.x ** 2;
		_vec.y *= radius.y ** 2;
		_vec.z *= radius.z ** 2;

		const gamma = Math.sqrt( _norm.dot( _vec ) );
		_vec.divideScalar( gamma );

		return target.copy( _vec ).addScaledVector( _norm, height );

	}

	getPositionToCartographic( vec, target ) {

		// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/Core/Ellipsoid.js#L463
		this.getPositionToSurfacePoint( vec, _vec );
		this.getPositionToNormal( vec, _norm );
		const h = _vec2.subVectors( vec, _vec );

		target.lon = Math.atan2( _norm.y, _norm.x );
		target.lat = Math.asin( _norm.z );
		target.height = Math.sign( h.dot( vec ) ) * h.length();
		return target;

	}

	getCartographicToNormal( lat, lon, target ) {

		_spherical.set( 1, latitudeToSphericalPhi( lat ), lon );
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

	getPositionToSurfacePoint( pos, target ) {

		// TODO: this is possibly wrong
		const normal = this.getPositionToNormal( pos, target );
		normal.x *= this.radius.x;
		normal.y *= this.radius.y;
		normal.z *= this.radius.z;

		return target;

	}

}
