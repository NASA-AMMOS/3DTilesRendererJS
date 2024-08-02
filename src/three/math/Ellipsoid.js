import { Vector3, Spherical, MathUtils, Ray, Matrix4, Sphere } from 'three';
import { swapToGeoFrame, latitudeToSphericalPhi } from './GeoUtils.js';

const _spherical = new Spherical();
const _norm = new Vector3();
const _vec = new Vector3();
const _vec2 = new Vector3();
const _vec3 = new Vector3();
const _matrix = new Matrix4();
const _sphere = new Sphere();

const _vecX = new Vector3();
const _vecY = new Vector3();
const _vecZ = new Vector3();
const _pos = new Vector3();

const _ray = new Ray();

const EPSILON12 = 1e-12;
const CENTER_EPS = 0.1;

export class Ellipsoid {

	constructor( x = 1, y = 1, z = 1 ) {

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

	// returns a frame with Z indicating altitude
	// Y pointing north
	// X pointing east
	constructLatLonFrame( lat, lon, target ) {

		this.getCartographicToPosition( lat, lon, 0, _pos );
		this.getCartographicToNormal( lat, lon, _vecZ );
		this.getNorthernTangent( lat, lon, _vecY );
		_vecX.crossVectors( _vecY, _vecZ );

		return target.makeBasis( _vecX, _vecY, _vecZ ).setPosition( _pos );

	}

	getNorthernTangent( lat, lon, target, westTarget = _vec3 ) {

		let multiplier = 1;
		let latPrime = lat + 1e-7;
		if ( lat > Math.PI / 4 ) {

			multiplier = - 1;
			latPrime = lat - 1e-7;

		}

		const norm = this.getCartographicToNormal( lat, lon, _vec ).normalize();
		const normPrime = this.getCartographicToNormal( latPrime, lon, _vec2 ).normalize();
		westTarget
			.crossVectors( norm, normPrime )
			.normalize()
			.multiplyScalar( multiplier );

		return target
			.crossVectors( westTarget, norm )
			.normalize();

	}

	getCartographicToPosition( lat, lon, height, target ) {

		// From Cesium function Ellipsoid.cartographicToCartesian
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

	getPositionToCartographic( pos, target ) {

		// From Cesium function Ellipsoid.cartesianToCartographic
		// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/Core/Ellipsoid.js#L463
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
		// https://github.com/CesiumGS/cesium/blob/d11b746e5809ac115fcff65b7b0c6bdfe81dcf1c/packages/engine/Source/Core/scaleToGeodeticSurface.js#L25
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

}
