/** @import { Frustum, Mat4, Plane } from 'playcanvas' */
import { BoundingSphere, Vec3 } from 'playcanvas';
import { OBB } from './OBB.js';

const _vecX = /* @__PURE__ */ new Vec3();
const _vecY = /* @__PURE__ */ new Vec3();
const _vecZ = /* @__PURE__ */ new Vec3();
const _scale = /* @__PURE__ */ new Vec3();

/**
 * The bounding volume of a tile, in the frame of the tileset. Supports the `sphere` and `box`
 * volume types.
 */
export class TileBoundingVolume {

	constructor() {

		/** @type {BoundingSphere|null} */
		this.sphere = null;

		/** @type {OBB|null} */
		this.obb = null;

	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} radius
	 * @param {Mat4} transform
	 */
	setSphereData( x, y, z, radius, transform ) {

		const center = transform.transformPoint( new Vec3( x, y, z ) );
		transform.getScale( _scale );
		this.sphere = new BoundingSphere( center, radius * Math.max( _scale.x, _scale.y, _scale.z ) );

	}

	/**
	 * @param {Array<number>} data - The 12 numbers of a 3D Tiles `box`: center, then the x, y and z
	 * half-axis vectors.
	 * @param {Mat4} transform
	 */
	setObbData( data, transform ) {

		const obb = new OBB();

		// get the extents of the bounds in each axis
		_vecX.set( data[ 3 ], data[ 4 ], data[ 5 ] );
		_vecY.set( data[ 6 ], data[ 7 ], data[ 8 ] );
		_vecZ.set( data[ 9 ], data[ 10 ], data[ 11 ] );

		const scaleX = _vecX.length();
		const scaleY = _vecY.length();
		const scaleZ = _vecZ.length();

		_vecX.normalize();
		_vecY.normalize();
		_vecZ.normalize();

		// handle the case where the box has a dimension of 0 in one axis
		if ( scaleX === 0 ) {

			_vecX.cross( _vecY, _vecZ );

		}

		if ( scaleY === 0 ) {

			_vecY.cross( _vecX, _vecZ );

		}

		if ( scaleZ === 0 ) {

			_vecZ.cross( _vecX, _vecY );

		}

		// the oriented frame the box exists in, placed in the tileset by the tile transform
		obb.transform.set( [
			_vecX.x, _vecX.y, _vecX.z, 0,
			_vecY.x, _vecY.y, _vecY.z, 0,
			_vecZ.x, _vecZ.y, _vecZ.z, 0,
			data[ 0 ], data[ 1 ], data[ 2 ], 1,
		] );
		obb.transform.mul2( transform, obb.transform );

		// scale the box by the extents
		obb.min.set( - scaleX, - scaleY, - scaleZ );
		obb.max.set( scaleX, scaleY, scaleZ );
		obb.update();
		this.obb = obb;

	}

	/**
	 * Returns the distance from the volume to the point, or 0 when the point is inside.
	 * @param {Vec3} point
	 * @returns {number}
	 */
	distanceToPoint( point ) {

		const { sphere, obb } = this;

		let sphereDistance = - Infinity;
		let obbDistance = - Infinity;

		if ( sphere ) {

			// clamp to zero inside the sphere so both volume types behave the same way
			sphereDistance = Math.max( sphere.center.distance( point ) - sphere.radius, 0 );

		}

		if ( obb ) {

			obbDistance = obb.distanceToPoint( point );

		}

		// return the further distance of the two volumes
		return sphereDistance > obbDistance ? sphereDistance : obbDistance;

	}

	/**
	 * @param {Frustum} frustum - The frustum, in the frame of the tileset.
	 * @param {Array<Plane>} frustumPlanes - The six planes of the frustum.
	 * @param {Array<Vec3>} frustumPoints - The eight corners of the frustum.
	 * @returns {boolean}
	 */
	intersectsFrustum( frustum, frustumPlanes, frustumPoints ) {

		const { sphere, obb } = this;

		if ( sphere && frustum.containsSphere( sphere ) === 0 ) {

			return false;

		}

		if ( obb && ! obb.intersectsFrustum( frustumPlanes, frustumPoints ) ) {

			return false;

		}

		// if we don't have a sphere or obb then just say we did intersect
		return Boolean( sphere || obb );

	}

}
