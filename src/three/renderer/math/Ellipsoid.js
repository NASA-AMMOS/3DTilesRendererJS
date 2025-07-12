import { Vector3, Spherical, MathUtils, Ray, Matrix4, Sphere, Euler } from 'three';
import { swapToGeoFrame, latitudeToSphericalPhi } from './GeoUtils.js';

const _spherical = new Spherical();
const _norm = new Vector3();
const _vec = new Vector3();
const _vec2 = new Vector3();
const _matrix = new Matrix4();
const _matrix2 = new Matrix4();
const _matrix3 = new Matrix4();
const _sphere = new Sphere();
const _euler = new Euler();

const _vecX = new Vector3();
const _vecY = new Vector3();
const _vecZ = new Vector3();
const _pos = new Vector3();

const _ray = new Ray();

const EPSILON12 = 1e-12;
const CENTER_EPS = 0.1;

export const ENU_FRAME = 0;
export const CAMERA_FRAME = 1;
export const OBJECT_FRAME = 2;

export class Ellipsoid {

	constructor( x = 1, y = 1, z = 1 ) {

		this.name = '';
		this.radius = new Vector3( x, y, z );

	}

	intersectRay( ray, target ) {

		_matrix.makeScale( ...this.radius ).invert();
		_sphere.center.set( 0, 0, 0 );
		_sphere.radius = 1;

		_ray.copy( ray ).applyMatrix4( _matrix );
		if ( _ray.intersectSphere( _sphere, target ) ) {

			_matrix.makeScale( ...this.radius );
			target.applyMatrix4( _matrix );
			return target;

		} else {

			return null;

		}

	}

	// returns a frame with Z indicating altitude, Y pointing north, X pointing east
	getEastNorthUpFrame( lat, lon, height, target ) {

		if ( height.isMatrix4 ) {

			target = height;
			height = 0;

			console.warn( 'Ellipsoid: The signature for "getEastNorthUpFrame" has changed.' );

		}

		this.getEastNorthUpAxes( lat, lon, _vecX, _vecY, _vecZ );
		this.getCartographicToPosition( lat, lon, height, _pos );
		return target.makeBasis( _vecX, _vecY, _vecZ ).setPosition( _pos );

	}

	// returns a frame with z indicating altitude and az, el, roll rotation within that frame
	// - azimuth: measured off of true north, increasing towards "east" (z-axis)
	// - elevation: measured off of the horizon, increasing towards sky (x-axis)
	// - roll: rotation around northern axis (y-axis)
	getOrientedEastNorthUpFrame( lat, lon, height, az, el, roll, target ) {

		return this.getObjectFrame( lat, lon, height, az, el, roll, target, ENU_FRAME );

	}

	// returns a frame similar to the ENU frame but rotated to match three.js object and camera conventions
	// OBJECT_FRAME: oriented such that "+Y" is up and "+Z" is forward.
	// CAMERA_FRAME: oriented such that "+Y" is up and "-Z" is forward.
	getObjectFrame( lat, lon, height, az, el, roll, target, frame = OBJECT_FRAME ) {

		this.getEastNorthUpFrame( lat, lon, height, _matrix );
		_euler.set( el, roll, - az, 'ZXY' );

		target
			.makeRotationFromEuler( _euler )
			.premultiply( _matrix );

		// Add in the orientation adjustment for objects and cameras so "forward" and "up" are oriented
		// correctly
		if ( frame === CAMERA_FRAME ) {

			_euler.set( Math.PI / 2, 0, 0, 'XYZ' );
			_matrix2.makeRotationFromEuler( _euler );
			target.multiply( _matrix2 );

		} else if ( frame === OBJECT_FRAME ) {

			_euler.set( - Math.PI / 2, 0, Math.PI, 'XYZ' );
			_matrix2.makeRotationFromEuler( _euler );
			target.multiply( _matrix2 );

		}

		return target;

	}

	getCartographicFromObjectFrame( matrix, target, frame = OBJECT_FRAME ) {

		// if working with a frame that is not the ENU_FRAME then multiply in the
		// offset for a camera or object so "forward" and "up" are oriented correct
		if ( frame === CAMERA_FRAME ) {

			_euler.set( - Math.PI / 2, 0, 0, 'XYZ' );
			_matrix2.makeRotationFromEuler( _euler ).premultiply( matrix );

		} else if ( frame === OBJECT_FRAME ) {

			_euler.set( - Math.PI / 2, 0, Math.PI, 'XYZ' );
			_matrix2.makeRotationFromEuler( _euler ).premultiply( matrix );

		} else {

			_matrix2.copy( matrix );

		}

		// get the cartographic position of the frame
		_pos.setFromMatrixPosition( _matrix2 );
		this.getPositionToCartographic( _pos, target );

		// get the relative rotation
		this.getEastNorthUpFrame( target.lat, target.lon, 0, _matrix ).invert();
		_matrix2.premultiply( _matrix );
		_euler.setFromRotationMatrix( _matrix2, 'ZXY' );

		target.azimuth = - _euler.z;
		target.elevation = _euler.x;
		target.roll = _euler.y;
		return target;

	}

	getEastNorthUpAxes( lat, lon, vecEast, vecNorth, vecUp, point = _pos ) {

		this.getCartographicToPosition( lat, lon, 0, point );
		this.getCartographicToNormal( lat, lon, vecUp );		// up
		vecEast.set( - point.y, point.x, 0 ).normalize();		// east
		vecNorth.crossVectors( vecUp, vecEast ).normalize();	// north

	}

	// azimuth: measured off of true north, increasing towards "east"
	// elevation: measured off of the horizon, increasing towards sky
	// roll: rotation around northern axis
	getAzElRollFromRotationMatrix( lat, lon, rotationMatrix, target, frame = ENU_FRAME ) {

		console.warn( 'Ellipsoid: "getAzElRollFromRotationMatrix" is deprecated. Use "getCartographicFromObjectFrame", instead.' );
		this.getCartographicToPosition( lat, lon, 0, _pos );
		_matrix3.copy( rotationMatrix ).setPosition( _pos );

		this.getCartographicFromObjectFrame( _matrix3, target, frame );
		delete target.height;
		delete target.lat;
		delete target.lon;

		return target;


	}

	getRotationMatrixFromAzElRoll( lat, lon, az, el, roll, target, frame = ENU_FRAME ) {

		console.warn( 'Ellipsoid: "getRotationMatrixFromAzElRoll" function has been deprecated. Use "getObjectFrame", instead.' );

		this.getObjectFrame( lat, lon, 0, az, el, roll, target, frame );
		target.setPosition( 0, 0, 0 );
		return target;

	}

	getFrame( lat, lon, az, el, roll, height, target, frame = ENU_FRAME ) {

		console.warn( 'Ellipsoid: "getFrame" function has been deprecated. Use "getObjectFrame", instead.' );
		return this.getObjectFrame( lat, lon, height, az, el, roll, target, frame );

	}

	getCartographicToPosition( lat, lon, height, target ) {

		// From Cesium function Ellipsoid.cartographicToCartesian
		// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/core/renderer/Ellipsoid.js#L396
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

	getPositionToCartographic( pos, target ) {

		// From Cesium function Ellipsoid.cartesianToCartographic
		// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/core/renderer/Ellipsoid.js#L463
		this.getPositionToSurfacePoint( pos, _vec );
		this.getPositionToNormal( pos, _norm );

		const heightDelta = _vec2.subVectors( pos, _vec );

		target.lon = Math.atan2( _norm.y, _norm.x );
		target.lat = Math.asin( _norm.z );
		target.height = Math.sign( heightDelta.dot( pos ) ) * heightDelta.length();
		return target;

	}

	getCartographicToNormal( lat, lon, target ) {

		_spherical.set( 1, latitudeToSphericalPhi( lat ), lon );
		target.setFromSpherical( _spherical ).normalize();

		// swap frame from the three.js frame to the geo coord frame
		swapToGeoFrame( target );
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

		// From Cesium function Ellipsoid.scaleToGeodeticSurface
		// https://github.com/CesiumGS/cesium/blob/d11b746e5809ac115fcff65b7b0c6bdfe81dcf1c/packages/engine/Source/core/renderer/scaleToGeodeticSurface.js#L25
		const radius = this.radius;
		const invRadiusSqX = 1 / ( radius.x ** 2 );
		const invRadiusSqY = 1 / ( radius.y ** 2 );
		const invRadiusSqZ = 1 / ( radius.z ** 2 );

		const x2 = pos.x * pos.x * invRadiusSqX;
		const y2 = pos.y * pos.y * invRadiusSqY;
		const z2 = pos.z * pos.z * invRadiusSqZ;

		// Compute the squared ellipsoid norm.
		const squaredNorm = x2 + y2 + z2;
		const ratio = Math.sqrt( 1.0 / squaredNorm );

		// As an initial approximation, assume that the radial intersection is the projection point.
		const intersection = _vec.copy( pos ).multiplyScalar( ratio );
		if ( squaredNorm < CENTER_EPS ) {

			return ! isFinite( ratio ) ? null : target.copy( intersection );

		}

		// Use the gradient at the intersection point in place of the true unit normal.
		// The difference in magnitude will be absorbed in the multiplier.
		const gradient = _vec2.set(
			intersection.x * invRadiusSqX * 2.0,
			intersection.y * invRadiusSqY * 2.0,
			intersection.z * invRadiusSqZ * 2.0
		);

		// Compute the initial guess at the normal vector multiplier, lambda.
		let lambda = ( 1.0 - ratio ) * pos.length() / ( 0.5 * gradient.length() );
		let correction = 0.0;

		let func, denominator;
		let xMultiplier, yMultiplier, zMultiplier;
		let xMultiplier2, yMultiplier2, zMultiplier2;
		let xMultiplier3, yMultiplier3, zMultiplier3;

		do {

			lambda -= correction;

			xMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSqX );
			yMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSqY );
			zMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSqZ );

			xMultiplier2 = xMultiplier * xMultiplier;
			yMultiplier2 = yMultiplier * yMultiplier;
			zMultiplier2 = zMultiplier * zMultiplier;

			xMultiplier3 = xMultiplier2 * xMultiplier;
			yMultiplier3 = yMultiplier2 * yMultiplier;
			zMultiplier3 = zMultiplier2 * zMultiplier;

			func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

			// "denominator" here refers to the use of this expression in the velocity and acceleration
			// computations in the sections to follow.
			denominator =
				x2 * xMultiplier3 * invRadiusSqX +
				y2 * yMultiplier3 * invRadiusSqY +
				z2 * zMultiplier3 * invRadiusSqZ;

			const derivative = - 2.0 * denominator;
			correction = func / derivative;

		} while ( Math.abs( func ) > EPSILON12 );

		return target.set(
			pos.x * xMultiplier,
			pos.y * yMultiplier,
			pos.z * zMultiplier
		);

	}

	calculateHorizonDistance( latitude, elevation ) {

		// from https://aty.sdsu.edu/explain/atmos_refr/horizon.html
		// OG = sqrt ( 2 R h + h2 ) .
		const effectiveRadius = this.calculateEffectiveRadius( latitude );
		return Math.sqrt( 2 * effectiveRadius * elevation + elevation ** 2 );

	}

	calculateEffectiveRadius( latitude ) {

		// This radius represents the distance from the center of the ellipsoid to the surface along the normal at the given latitude.
		// from https://en.wikipedia.org/wiki/Earth_radius#Prime_vertical
		// N = a / sqrt(1 - e^2 * sin^2(phi))
		const semiMajorAxis = this.radius.x;
		const semiMinorAxis = this.radius.z;
		const eSquared = 1 - ( semiMinorAxis ** 2 / semiMajorAxis ** 2 );
		const phi = latitude * MathUtils.DEG2RAD;

		const sinPhiSquared = Math.sin( phi ) ** 2;
		const N = semiMajorAxis / Math.sqrt( 1 - eSquared * sinPhiSquared );
		return N;

	}

	getPositionElevation( pos ) {

		// logic from "getPositionToCartographic"
		this.getPositionToSurfacePoint( pos, _vec );

		const heightDelta = _vec2.subVectors( pos, _vec );
		return Math.sign( heightDelta.dot( pos ) ) * heightDelta.length();

	}

	copy( source ) {

		this.radius.copy( source.radius );
		return this;

	}

	clone() {

		return new this.constructor().copy( this );

	}

}
