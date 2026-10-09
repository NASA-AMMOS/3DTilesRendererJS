/** @import { CameraFrustum } from './CameraFrustum.js' */
import { Vec3 } from 'playcanvas';
import { createMatrix, invertMatrix, transformDirection, transformPoint } from './MatrixUtils.js';

const _point = /* @__PURE__ */ new Vec3();
const _min = /* @__PURE__ */ new Vec3();
const _max = /* @__PURE__ */ new Vec3();
const _normal = /* @__PURE__ */ new Vec3();

/**
 * A 64-bit oriented bounding box: an axis-aligned box from `min` to `max` in the frame given by
 * `transform`.
 */
export class OBB {

	constructor() {

		this.min = new Vec3( - 1, - 1, - 1 );
		this.max = new Vec3( 1, 1, 1 );
		this.transform = createMatrix();
		this.inverseTransform = createMatrix();

		// eight world space corners as x, y, z
		this.points = new Float64Array( 24 );

		// six inward-facing world space planes as nx, ny, nz, d
		this.planes = new Float64Array( 24 );

	}

	/**
	 * Recomputes the inverse transform, corners and planes after `min`, `max` or `transform` change.
	 */
	update() {

		const { min, max, transform, points, planes } = this;
		invertMatrix( transform, this.inverseTransform );

		let index = 0;
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let z = 0; z <= 1; z ++ ) {

					transformPoint(
						transform,
						x === 0 ? min.x : max.x,
						y === 0 ? min.y : max.y,
						z === 0 ? min.z : max.z,
						_point,
					);
					points[ index ++ ] = _point.x;
					points[ index ++ ] = _point.y;
					points[ index ++ ] = _point.z;

				}

			}

		}

		// a pair of opposing planes per box axis, through the min and max corners
		transformPoint( transform, min.x, min.y, min.z, _min );
		transformPoint( transform, max.x, max.y, max.z, _max );
		transformDirection( transform, 0, 0, 1, _normal );
		setPlanePair( planes, 0, _normal, _min, _max );
		transformDirection( transform, 0, 1, 0, _normal );
		setPlanePair( planes, 2, _normal, _min, _max );
		transformDirection( transform, 1, 0, 0, _normal );
		setPlanePair( planes, 4, _normal, _min, _max );

	}

	/**
	 * Returns the point inside the box that is closest to the given point.
	 * @param {Vec3} point
	 * @param {Vec3} target
	 * @returns {Vec3}
	 */
	clampPoint( point, target ) {

		const { min, max } = this;
		transformPoint( this.inverseTransform, point.x, point.y, point.z, target );
		target.x = Math.max( min.x, Math.min( max.x, target.x ) );
		target.y = Math.max( min.y, Math.min( max.y, target.y ) );
		target.z = Math.max( min.z, Math.min( max.z, target.z ) );
		return transformPoint( this.transform, target.x, target.y, target.z, target );

	}

	/**
	 * Returns the distance from the box to the point, or 0 when the point is inside.
	 * @param {Vec3} point
	 * @returns {number}
	 */
	distanceToPoint( point ) {

		return this.clampPoint( point, _point ).distance( point );

	}

	/**
	 * @param {CameraFrustum} frustum
	 * @returns {boolean}
	 */
	intersectsFrustum( frustum ) {

		// test the box corners against the frustum planes, then the frustum corners against the box
		// planes, which removes most of the false positives a one-sided test reports
		return ! isSeparated( frustum.planes, this.points ) && ! isSeparated( this.planes, frustum.points );

	}

}

// whether all points lie behind any one of the planes
function isSeparated( planes, points ) {

	for ( let i = 0; i < 24; i += 4 ) {

		const nx = planes[ i ];
		const ny = planes[ i + 1 ];
		const nz = planes[ i + 2 ];
		const d = planes[ i + 3 ];
		let maxDistance = - Infinity;
		for ( let j = 0; j < 24; j += 3 ) {

			const distance = nx * points[ j ] + ny * points[ j + 1 ] + nz * points[ j + 2 ] + d;
			maxDistance = Math.max( maxDistance, distance );

		}

		if ( maxDistance < 0 ) {

			return true;

		}

	}

	return false;

}

function setPlanePair( planes, index, normal, min, max ) {

	const offset = index * 4;
	planes[ offset ] = normal.x;
	planes[ offset + 1 ] = normal.y;
	planes[ offset + 2 ] = normal.z;
	planes[ offset + 3 ] = - normal.dot( min );
	planes[ offset + 4 ] = - normal.x;
	planes[ offset + 5 ] = - normal.y;
	planes[ offset + 6 ] = - normal.z;
	planes[ offset + 7 ] = normal.dot( max );

}
