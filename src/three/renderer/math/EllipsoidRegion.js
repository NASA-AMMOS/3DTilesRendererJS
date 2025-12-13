import { Matrix4, Vector3, Box3 } from 'three';
import { Ellipsoid } from './Ellipsoid.js';

// bounds are lightly inflated to account for floating point error
const INFLATE_EPSILON = 1e-13;
const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = /* @__PURE__*/ new Vector3();
const _orthoY = /* @__PURE__*/ new Vector3();
const _orthoZ = /* @__PURE__*/ new Vector3();
const _vec = /* @__PURE__*/ new Vector3();
const _invMatrix = /* @__PURE__*/ new Matrix4();
const _box = /* @__PURE__*/ new Box3();
const _matrix = /* @__PURE__*/ new Matrix4();

function expandSphereRadiusSquared( vec, target ) {

	target.radius = Math.max( target.radius, vec.distanceToSquared( target.center ) );

}

function isTriaxial( radii ) {

	return radii.x !== radii.y;

}

export class EllipsoidRegion extends Ellipsoid {

	constructor(
		x = 1, y = 1, z = 1,
		latStart = - HALF_PI, latEnd = HALF_PI,
		lonStart = 0, lonEnd = 2 * PI,
		heightStart = 0, heightEnd = 0
	) {

		super( x, y, z );
		this.latStart = latStart;
		this.latEnd = latEnd;
		this.lonStart = lonStart;
		this.lonEnd = lonEnd;
		this.heightStart = heightStart;
		this.heightEnd = heightEnd;

	}

	getBoundingBox( box, matrix ) {

		if ( isTriaxial( this.radius ) ) {

			console.warn( 'EllipsoidRegion: Triaxial ellipsoids are not supported.' );

		}

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const latMid = ( latStart + latEnd ) * 0.5;
		const lonMid = ( lonStart + lonEnd ) * 0.5;
		const allAboveEquator = latStart > 0.0;
		const allBelowEquator = latEnd < 0.0;

		let nearEquatorLat;
		if ( allAboveEquator ) {

			nearEquatorLat = latStart;

		} else if ( allBelowEquator ) {

			nearEquatorLat = latEnd;

		} else {

			nearEquatorLat = 0;

		}

		// measure the extents
		const { min, max } = box;
		min.setScalar( Infinity );
		max.setScalar( - Infinity );
		if ( lonEnd - lonStart <= PI ) {

			// extract the axes
			this.getCartographicToNormal( latMid, lonMid, _orthoZ );
			_orthoY.set( 0, 0, 1 );
			_orthoX.crossVectors( _orthoY, _orthoZ ).normalize();
			_orthoY.crossVectors( _orthoZ, _orthoX ).normalize();

			// construct the frame
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );
			_invMatrix.copy( matrix ).invert();

			// extract x
			// check the most bowing point near the equator relative to the frame
			this.getCartographicToPosition( nearEquatorLat, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.x = Math.abs( _vec.x );
			min.x = - max.x;

			// extract y
			// check corners and mid points for the top
			this.getCartographicToPosition( latEnd, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.y = _vec.y;

			this.getCartographicToPosition( latEnd, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.y = Math.max( _vec.y, max.y );

			// check corners and mid points for the bottom
			this.getCartographicToPosition( latStart, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.y = _vec.y;

			this.getCartographicToPosition( latStart, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.y = Math.min( _vec.y, min.y );

			// extract z
			// check center point
			this.getCartographicToPosition( latMid, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.z = _vec.z;

			// check top and bottom reverse points
			this.getCartographicToPosition( latStart, lonStart, heightStart, _vec ).applyMatrix4( _invMatrix );
			min.z = _vec.z;

			this.getCartographicToPosition( latEnd, lonStart, heightStart, _vec ).applyMatrix4( _invMatrix );
			min.z = Math.min( _vec.z, min.z );

		} else {

			// extract a vector towards the middle of the region
			this.getCartographicToPosition( nearEquatorLat, lonMid, heightEnd, _orthoZ );
			_orthoZ.z = 0;
			if ( _orthoZ.length() < 1e-10 ) {

				_orthoZ.set( 1, 0, 0 );

			} else {

				_orthoZ.normalize();

			}

			_orthoY.set( 0, 0, 1 );
			_orthoX.crossVectors( _orthoZ, _orthoY ).normalize();

			// construct the OBB frame
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );
			_invMatrix.copy( matrix ).invert();

			// x extents
			// find the furthest point rotated 90 degrees from the center of the region
			this.getCartographicToPosition( nearEquatorLat, lonMid + HALF_PI, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.x = Math.abs( _vec.x );
			min.x = - max.x;

			// y extents
			// measure the top of the region, accounting for the diagonal tilt of the edge
			this.getCartographicToPosition( latEnd, 0, allBelowEquator ? heightStart : heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.y = _vec.y;

			// measure the bottom of the region, accounting for the diagonal tilt of the edge
			this.getCartographicToPosition( latStart, 0, allAboveEquator ? heightStart : heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.y = _vec.y;

			// z extends
			// measure the furthest point at the center of the region
			this.getCartographicToPosition( nearEquatorLat, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.z = _vec.z;

			// measure the opposite end, which is guaranteed to be at the furthest extents since this lon region extents is > PI
			this.getCartographicToPosition( nearEquatorLat, lonEnd, heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.z = _vec.z;

		}

		// center the frame
		box.getCenter( _vec );
		box.min.sub( _vec ).multiplyScalar( 1 + INFLATE_EPSILON );
		box.max.sub( _vec ).multiplyScalar( 1 + INFLATE_EPSILON );

		_vec.applyMatrix4( matrix );
		matrix.setPosition( _vec );

	}

	getBoundingSphere( sphere ) {

		if ( isTriaxial( this.radius ) ) {

			console.warn( 'EllipsoidRegion: Triaxial ellipsoids are not supported.' );

		}

		// TODO: this could be optimized or the OBB could be generated at the same time since
		// a lot of the the points are reused

		// use the OBB function to get a reasonable center
		this.getBoundingBox( _box, _matrix );
		sphere.center.setFromMatrixPosition( _matrix );
		sphere.radius = 0;

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const latMid = ( latStart + latEnd ) * 0.5;
		const lonMid = ( lonStart + lonEnd ) * 0.5;
		const allAboveEquator = latStart > 0.0;
		const allBelowEquator = latEnd < 0.0;

		let nearEquatorLat;
		if ( allAboveEquator ) {

			nearEquatorLat = latStart;

		} else if ( allBelowEquator ) {

			nearEquatorLat = latEnd;

		} else {

			nearEquatorLat = 0;

		}

		// lon start extremity
		this.getCartographicToPosition( nearEquatorLat, lonStart, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check corners and mid points for the top
		this.getCartographicToPosition( latEnd, lonStart, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		this.getCartographicToPosition( latEnd, lonMid, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check corners and mid points for the bottom
		this.getCartographicToPosition( latStart, lonStart, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		this.getCartographicToPosition( latStart, lonMid, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check center extremity
		this.getCartographicToPosition( latMid, lonMid, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check lower height extremity
		this.getCartographicToPosition( latStart, lonStart, heightStart, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check 90 degree offset if range is larger than PI
		if ( lonEnd - lonStart > PI ) {

			this.getCartographicToPosition( nearEquatorLat, lonMid + PI, heightEnd, _vec );
			expandSphereRadiusSquared( _vec, sphere );

		}

		sphere.radius = Math.sqrt( sphere.radius ) * ( 1 + INFLATE_EPSILON );

	}

}
