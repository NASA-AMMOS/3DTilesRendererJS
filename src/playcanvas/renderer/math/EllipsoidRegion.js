import { Vec3 } from 'playcanvas';
import { Ellipsoid } from './Ellipsoid.js';
import { createMatrix, invertMatrix, setIdentity, transformPoint } from './MatrixUtils.js';

// bounds are lightly inflated to account for floating point error
const INFLATE_EPSILON = 1e-13;

const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = /* @__PURE__ */ new Vec3();
const _orthoY = /* @__PURE__ */ new Vec3();
const _orthoZ = /* @__PURE__ */ new Vec3();
const _vec = /* @__PURE__ */ new Vec3();
const _invMatrix = /* @__PURE__ */ createMatrix();

/**
 * A region on the surface of an ellipsoid, bounded by latitude, longitude and height, as used by
 * the 3D Tiles `region` bounding volume. All values are in radians and meters, and computed in
 * 64-bit precision.
 * @extends Ellipsoid
 */
export class EllipsoidRegion extends Ellipsoid {

	/**
	 * @param {number} [x=1] - Semi-axis radius along the X axis.
	 * @param {number} [y=1] - Semi-axis radius along the Y axis.
	 * @param {number} [z=1] - Semi-axis radius along the Z axis.
	 * @param {number} [latStart=-PI/2]
	 * @param {number} [latEnd=PI/2]
	 * @param {number} [lonStart=0]
	 * @param {number} [lonEnd=2*PI]
	 * @param {number} [heightStart=0]
	 * @param {number} [heightEnd=0]
	 */
	constructor(
		x = 1, y = 1, z = 1,
		latStart = - HALF_PI, latEnd = HALF_PI,
		lonStart = 0, lonEnd = 2 * PI,
		heightStart = 0, heightEnd = 0,
	) {

		super( x, y, z );

		this.latStart = latStart;
		this.latEnd = latEnd;
		this.lonStart = lonStart;
		this.lonEnd = lonEnd;
		this.heightStart = heightStart;
		this.heightEnd = heightEnd;

	}

	/**
	 * Computes an oriented box enclosing the region: the box extents are written into `min` and
	 * `max`, and the frame of the box into `matrix`.
	 * @param {Vec3} min
	 * @param {Vec3} max
	 * @param {Float64Array} matrix
	 */
	getBoundingBox( min, max, matrix ) {

		if ( this.radius.x !== this.radius.y ) {

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
		min.set( Infinity, Infinity, Infinity );
		max.set( - Infinity, - Infinity, - Infinity );

		const toFrame = ( lat, lon, height ) => {

			this.getCartographicToPosition( lat, lon, height, _vec );
			return transformPoint( _invMatrix, _vec.x, _vec.y, _vec.z, _vec );

		};

		if ( lonEnd - lonStart <= PI ) {

			// extract the axes
			this.getCartographicToNormal( latMid, lonMid, _orthoZ );
			_orthoY.set( 0, 0, 1 );
			_orthoX.cross( _orthoY, _orthoZ ).normalize();
			_orthoY.cross( _orthoZ, _orthoX ).normalize();

			// construct the frame
			makeBasis( _orthoX, _orthoY, _orthoZ, matrix );
			invertMatrix( matrix, _invMatrix );

			// extract x: check the most bowing point near the equator relative to the frame
			max.x = Math.abs( toFrame( nearEquatorLat, lonStart, heightEnd ).x );
			min.x = - max.x;

			// extract y: check corners and mid points for the top and the bottom
			max.y = Math.max( toFrame( latEnd, lonStart, heightEnd ).y, toFrame( latEnd, lonMid, heightEnd ).y );
			min.y = Math.min( toFrame( latStart, lonStart, heightEnd ).y, toFrame( latStart, lonMid, heightEnd ).y );

			// extract z: check the center point, and the top and bottom reverse points
			max.z = toFrame( latMid, lonMid, heightEnd ).z;
			min.z = Math.min( toFrame( latStart, lonStart, heightStart ).z, toFrame( latEnd, lonStart, heightStart ).z );

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
			_orthoX.cross( _orthoZ, _orthoY ).normalize();

			// construct the frame
			makeBasis( _orthoX, _orthoY, _orthoZ, matrix );
			invertMatrix( matrix, _invMatrix );

			// x extents: the furthest point rotated 90 degrees from the center of the region
			max.x = Math.abs( toFrame( nearEquatorLat, lonMid + HALF_PI, heightEnd ).x );
			min.x = - max.x;

			// y extents: the top and bottom of the region, accounting for the diagonal tilt of the edge
			max.y = toFrame( latEnd, 0, allBelowEquator ? heightStart : heightEnd ).y;
			min.y = toFrame( latStart, 0, allAboveEquator ? heightStart : heightEnd ).y;

			// z extents: the furthest point at the center of the region, and the opposite end, which
			// is at the furthest extent as the region spans more than PI in longitude
			max.z = toFrame( nearEquatorLat, lonMid, heightEnd ).z;
			min.z = toFrame( nearEquatorLat, lonEnd, heightEnd ).z;

		}

		// center the frame on the box
		const cx = ( min.x + max.x ) * 0.5;
		const cy = ( min.y + max.y ) * 0.5;
		const cz = ( min.z + max.z ) * 0.5;
		min.set( ( min.x - cx ) * ( 1 + INFLATE_EPSILON ), ( min.y - cy ) * ( 1 + INFLATE_EPSILON ), ( min.z - cz ) * ( 1 + INFLATE_EPSILON ) );
		max.set( ( max.x - cx ) * ( 1 + INFLATE_EPSILON ), ( max.y - cy ) * ( 1 + INFLATE_EPSILON ), ( max.z - cz ) * ( 1 + INFLATE_EPSILON ) );

		transformPoint( matrix, cx, cy, cz, _vec );
		matrix[ 12 ] = _vec.x;
		matrix[ 13 ] = _vec.y;
		matrix[ 14 ] = _vec.z;

	}

}

// a rotation matrix from the three axes
function makeBasis( x, y, z, target ) {

	setIdentity( target );
	target[ 0 ] = x.x;
	target[ 1 ] = x.y;
	target[ 2 ] = x.z;
	target[ 4 ] = y.x;
	target[ 5 ] = y.y;
	target[ 6 ] = y.z;
	target[ 8 ] = z.x;
	target[ 9 ] = z.y;
	target[ 10 ] = z.z;
	return target;

}
