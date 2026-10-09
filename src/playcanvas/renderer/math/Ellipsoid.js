import { Vec3 } from 'playcanvas';
import { WGS84_HEIGHT, WGS84_RADIUS } from '3d-tiles-renderer/core';
import { makeRotationX, makeRotationY, makeRotationZ, multiplyMatrices, setIdentity } from './MatrixUtils.js';

const _norm = /* @__PURE__ */ new Vec3();
const _vec = /* @__PURE__ */ new Vec3();
const _vec2 = /* @__PURE__ */ new Vec3();
const _east = /* @__PURE__ */ new Vec3();
const _north = /* @__PURE__ */ new Vec3();
const _up = /* @__PURE__ */ new Vec3();
const _pos = /* @__PURE__ */ new Vec3();
const _enu = /* @__PURE__ */ new Float64Array( 16 );
const _rotation = /* @__PURE__ */ new Float64Array( 16 );
const _temp = /* @__PURE__ */ new Float64Array( 16 );

const EPSILON12 = 1e-12;
const CENTER_EPS = 0.1;

/**
 * Frame constant for the East-North-Up (ENU) coordinate frame, with X pointing east, Y pointing
 * north, and Z pointing up (away from the ellipsoid surface).
 */
export const ENU_FRAME = 0;

/**
 * Frame constant for a camera-convention frame relative to the ENU frame, oriented with "+Y" up
 * and "-Z" forward (matching PlayCanvas camera conventions).
 */
export const CAMERA_FRAME = 1;

/**
 * Frame constant for an object-convention frame relative to the ENU frame, oriented with "+Y" up
 * and "+Z" forward.
 */
export const OBJECT_FRAME = 2;

/**
 * A triaxial ellipsoid defined by three semi-axis radii, used to model planet-scale surfaces such
 * as the Earth (see {@link WGS84_ELLIPSOID}). All geographic coordinates use latitude and longitude
 * in radians, and all results are computed in 64-bit precision. Matrices are column-major
 * Float64Arrays.
 */
export class Ellipsoid {

	/**
	 * @param {number} [x=1] - Semi-axis radius along the X axis.
	 * @param {number} [y=1] - Semi-axis radius along the Y axis.
	 * @param {number} [z=1] - Semi-axis radius along the Z axis.
	 */
	constructor( x = 1, y = 1, z = 1 ) {

		/**
		 * The name of the body, if known.
		 * @type {string}
		 */
		this.name = '';

		/**
		 * The semi-axis radii.
		 * @type {Vec3}
		 */
		this.radius = new Vec3( x, y, z );

	}

	/**
	 * Writes the East-North-Up frame at the given position into `target`: X points east, Y points
	 * north and Z points up.
	 * @param {number} lat
	 * @param {number} lon
	 * @param {number} height - Height above the ellipsoid surface in meters.
	 * @param {Float64Array} target
	 * @returns {Float64Array}
	 */
	getEastNorthUpFrame( lat, lon, height, target ) {

		this.getEastNorthUpAxes( lat, lon, _east, _north, _up );
		this.getCartographicToPosition( lat, lon, height, _pos );

		setIdentity( target );
		target[ 0 ] = _east.x;
		target[ 1 ] = _east.y;
		target[ 2 ] = _east.z;
		target[ 4 ] = _north.x;
		target[ 5 ] = _north.y;
		target[ 6 ] = _north.z;
		target[ 8 ] = _up.x;
		target[ 9 ] = _up.y;
		target[ 10 ] = _up.z;
		target[ 12 ] = _pos.x;
		target[ 13 ] = _pos.y;
		target[ 14 ] = _pos.z;
		return target;

	}

	/**
	 * Writes a frame at the given position into `target`, rotated by the given azimuth, elevation
	 * and roll, and adjusted to the `frame` convention.
	 * @param {number} lat
	 * @param {number} lon
	 * @param {number} height - Height above the ellipsoid surface in meters.
	 * @param {number} az - Azimuth, measured from true north towards east.
	 * @param {number} el - Elevation, measured from the horizon upward.
	 * @param {number} roll - Roll around the north axis.
	 * @param {Float64Array} target
	 * @param {number} [frame] - One of {@link ENU_FRAME}, {@link CAMERA_FRAME} or
	 * {@link OBJECT_FRAME}. Defaults to {@link OBJECT_FRAME}.
	 * @returns {Float64Array}
	 */
	getObjectFrame( lat, lon, height, az, el, roll, target, frame = OBJECT_FRAME ) {

		this.getEastNorthUpFrame( lat, lon, height, _enu );

		// the rotation of a "ZXY" euler ( el, roll, -az ): Rz( -az ) * Rx( el ) * Ry( roll )
		makeRotationZ( - az, _rotation );
		multiplyMatrices( _rotation, makeRotationX( el, _temp ), _rotation );
		multiplyMatrices( _rotation, makeRotationY( roll, _temp ), _rotation );
		multiplyMatrices( _enu, _rotation, target );

		// orient "forward" and "up" for objects and cameras
		if ( frame === CAMERA_FRAME ) {

			multiplyMatrices( target, makeRotationX( Math.PI / 2, _temp ), target );

		} else if ( frame === OBJECT_FRAME ) {

			// the rotation of an "XYZ" euler ( -PI / 2, 0, PI ): Rx( -PI / 2 ) * Rz( PI )
			makeRotationX( - Math.PI / 2, _rotation );
			multiplyMatrices( _rotation, makeRotationZ( Math.PI, _temp ), _rotation );
			multiplyMatrices( target, _rotation, target );

		}

		return target;

	}

	/**
	 * @param {number} lat
	 * @param {number} lon
	 * @param {Vec3} vecEast
	 * @param {Vec3} vecNorth
	 * @param {Vec3} vecUp
	 */
	getEastNorthUpAxes( lat, lon, vecEast, vecNorth, vecUp ) {

		this.getCartographicToPosition( lat, lon, 0, _vec2 );
		this.getCartographicToNormal( lat, lon, vecUp );
		vecEast.set( - _vec2.y, _vec2.x, 0 ).normalize();
		vecNorth.cross( vecUp, vecEast ).normalize();

	}

	/**
	 * Converts geographic coordinates to a position on the ellipsoid surface, plus the given
	 * height offset.
	 * @param {number} lat
	 * @param {number} lon
	 * @param {number} height - Height above the ellipsoid surface in meters.
	 * @param {Vec3} target
	 * @returns {Vec3}
	 */
	getCartographicToPosition( lat, lon, height, target ) {

		// From Cesium function Ellipsoid.cartographicToCartesian
		this.getCartographicToNormal( lat, lon, _norm );
		const radius = this.radius;
		_vec.set( _norm.x * radius.x ** 2, _norm.y * radius.y ** 2, _norm.z * radius.z ** 2 );
		const gamma = Math.sqrt( _norm.dot( _vec ) );
		return target.set(
			_vec.x / gamma + _norm.x * height,
			_vec.y / gamma + _norm.y * height,
			_vec.z / gamma + _norm.z * height,
		);

	}

	/**
	 * Converts a position to geographic coordinates.
	 * @param {Vec3} pos
	 * @param {{ lat: number, lon: number, height: number }} target
	 * @returns {{ lat: number, lon: number, height: number }}
	 */
	getPositionToCartographic( pos, target ) {

		// From Cesium function Ellipsoid.cartesianToCartographic
		this.getPositionToSurfacePoint( pos, _vec );
		this.getPositionToNormal( _vec, _norm );
		_vec2.sub2( pos, _vec );

		target.lon = Math.atan2( _norm.y, _norm.x );
		target.lat = Math.asin( _norm.z );
		target.height = Math.sign( _vec2.dot( pos ) ) * _vec2.length();
		return target;

	}

	/**
	 * Returns the geodetic surface normal at the given latitude and longitude.
	 * @param {number} lat
	 * @param {number} lon
	 * @param {Vec3} target
	 * @returns {Vec3}
	 */
	getCartographicToNormal( lat, lon, target ) {

		const cosLat = Math.cos( lat );
		return target.set( cosLat * Math.cos( lon ), cosLat * Math.sin( lon ), Math.sin( lat ) );

	}

	/**
	 * Returns the geodetic surface normal at the given position.
	 * @param {Vec3} pos
	 * @param {Vec3} target
	 * @returns {Vec3}
	 */
	getPositionToNormal( pos, target ) {

		const radius = this.radius;
		return target.set( pos.x / radius.x ** 2, pos.y / radius.y ** 2, pos.z / radius.z ** 2 ).normalize();

	}

	/**
	 * Projects the position onto the ellipsoid surface along the geodetic normal. Returns null if
	 * the position is at or near the center.
	 * @param {Vec3} pos
	 * @param {Vec3} target
	 * @returns {Vec3|null}
	 */
	getPositionToSurfacePoint( pos, target ) {

		// From Cesium function Ellipsoid.scaleToGeodeticSurface
		const radius = this.radius;
		const invRadiusSqX = 1 / ( radius.x ** 2 );
		const invRadiusSqY = 1 / ( radius.y ** 2 );
		const invRadiusSqZ = 1 / ( radius.z ** 2 );

		const x2 = pos.x * pos.x * invRadiusSqX;
		const y2 = pos.y * pos.y * invRadiusSqY;
		const z2 = pos.z * pos.z * invRadiusSqZ;

		// as an initial approximation, assume that the radial intersection is the projection point
		const squaredNorm = x2 + y2 + z2;
		const ratio = Math.sqrt( 1.0 / squaredNorm );
		const intersection = _vec.copy( pos ).mulScalar( ratio );
		if ( squaredNorm < CENTER_EPS ) {

			return ! isFinite( ratio ) ? null : target.copy( intersection );

		}

		// use the gradient at the intersection point in place of the true unit normal, the
		// difference in magnitude is absorbed in the multiplier
		const gradient = _vec2.set(
			intersection.x * invRadiusSqX * 2.0,
			intersection.y * invRadiusSqY * 2.0,
			intersection.z * invRadiusSqZ * 2.0,
		);

		let lambda = ( 1.0 - ratio ) * pos.length() / ( 0.5 * gradient.length() );
		let correction = 0.0;
		let func;
		let xMultiplier, yMultiplier, zMultiplier;
		do {

			lambda -= correction;

			xMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSqX );
			yMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSqY );
			zMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSqZ );

			const xMultiplier2 = xMultiplier * xMultiplier;
			const yMultiplier2 = yMultiplier * yMultiplier;
			const zMultiplier2 = zMultiplier * zMultiplier;

			func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

			const denominator =
				x2 * xMultiplier2 * xMultiplier * invRadiusSqX +
				y2 * yMultiplier2 * yMultiplier * invRadiusSqY +
				z2 * zMultiplier2 * zMultiplier * invRadiusSqZ;

			correction = func / ( - 2.0 * denominator );

		} while ( Math.abs( func ) > EPSILON12 );

		return target.set( pos.x * xMultiplier, pos.y * yMultiplier, pos.z * zMultiplier );

	}

	/**
	 * @param {Ellipsoid} source
	 * @returns {Ellipsoid}
	 */
	copy( source ) {

		this.name = source.name;
		this.radius.copy( source.radius );
		return this;

	}

}

/**
 * The WGS84 reference ellipsoid used to model the Earth.
 * @type {Ellipsoid}
 */
export const WGS84_ELLIPSOID = /* @__PURE__ */ ( () => {

	const ellipsoid = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
	ellipsoid.name = 'WGS84 Earth';
	return ellipsoid;

} )();
