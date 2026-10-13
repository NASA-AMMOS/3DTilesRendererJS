import { Mat4, Plane, Vec3 } from 'playcanvas';

const _point = /* @__PURE__ */ new Vec3();
const _min = /* @__PURE__ */ new Vec3();
const _max = /* @__PURE__ */ new Vec3();
const _axis = /* @__PURE__ */ new Vec3();

/**
 * An oriented bounding box: an axis-aligned box from `min` to `max` in the frame given by
 * `transform`.
 */
export class OBB {

	constructor() {

		this.min = new Vec3( - 1, - 1, - 1 );
		this.max = new Vec3( 1, 1, 1 );
		this.transform = new Mat4();
		this.inverseTransform = new Mat4();

		// the eight corners and six inward facing planes of the box, in the frame of the transform
		this.points = new Array( 8 ).fill( null ).map( () => new Vec3() );
		this.planes = new Array( 6 ).fill( null ).map( () => new Plane() );

	}

	/**
	 * Recomputes the inverse transform, corners and planes after `min`, `max` or `transform` change.
	 */
	update() {

		const { min, max, transform, points, planes } = this;
		this.inverseTransform.copy( transform ).invert();

		let index = 0;
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let z = 0; z <= 1; z ++ ) {

					_point.set( x === 0 ? min.x : max.x, y === 0 ? min.y : max.y, z === 0 ? min.z : max.z );
					transform.transformPoint( _point, points[ index ++ ] );

				}

			}

		}

		// a pair of opposing planes per box axis, through the min and max corners
		transform.transformPoint( min, _min );
		transform.transformPoint( max, _max );
		setPlanePair( planes, 0, transform.getX( _axis ).normalize() );
		setPlanePair( planes, 2, transform.getY( _axis ).normalize() );
		setPlanePair( planes, 4, transform.getZ( _axis ).normalize() );

	}

	/**
	 * Returns the point inside the box that is closest to the given point.
	 * @param {Vec3} point
	 * @param {Vec3} target
	 * @returns {Vec3}
	 */
	clampPoint( point, target ) {

		const { min, max } = this;
		this.inverseTransform.transformPoint( point, target );
		target.x = Math.max( min.x, Math.min( max.x, target.x ) );
		target.y = Math.max( min.y, Math.min( max.y, target.y ) );
		target.z = Math.max( min.z, Math.min( max.z, target.z ) );
		return this.transform.transformPoint( target, target );

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
	 * @param {Array<Plane>} frustumPlanes - The six inward facing planes of the frustum.
	 * @param {Array<Vec3>} frustumPoints - The eight corners of the frustum.
	 * @returns {boolean}
	 */
	intersectsFrustum( frustumPlanes, frustumPoints ) {

		// test the box corners against the frustum planes, then the frustum corners against the box
		// planes, which removes most of the false positives a one-sided test reports
		return ! isSeparated( frustumPlanes, this.points ) && ! isSeparated( this.planes, frustumPoints );

	}

}

// the planes through the min and max corners, facing into the box along the axis
function setPlanePair( planes, index, axis ) {

	planes[ index ].setFromPointNormal( _min, axis );
	planes[ index + 1 ].setFromPointNormal( _max, axis.mulScalar( - 1 ) );

}

// whether all points lie behind any one of the planes
function isSeparated( planes, points ) {

	for ( let i = 0; i < planes.length; i ++ ) {

		const { normal, distance } = planes[ i ];
		let inside = false;
		for ( let j = 0; j < points.length && ! inside; j ++ ) {

			inside = normal.dot( points[ j ] ) + distance >= 0;

		}

		if ( ! inside ) {

			return true;

		}

	}

	return false;

}
