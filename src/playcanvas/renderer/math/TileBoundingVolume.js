/** @import { CameraFrustum } from './CameraFrustum.js' */
/** @import { Ellipsoid } from './Ellipsoid.js' */
import { Vec3 } from 'playcanvas';
import { getMaxScale, multiplyMatrices, transformPoint } from './MatrixUtils.js';
import { EllipsoidRegion } from './EllipsoidRegion.js';
import { OBB } from './OBB.js';

const _vecX = /* @__PURE__ */ new Vec3();
const _vecY = /* @__PURE__ */ new Vec3();
const _vecZ = /* @__PURE__ */ new Vec3();

/**
 * The bounding volume of a tile in the tileset frame. Supports the `sphere`, `box` and `region`
 * volume types; a region is tested using an oriented box enclosing it.
 */
export class TileBoundingVolume {

	constructor() {

		/** @type {{ center: Vec3, radius: number }|null} */
		this.sphere = null;

		/** @type {OBB|null} */
		this.obb = null;

		/** @type {EllipsoidRegion|null} */
		this.region = null;

		/**
		 * The oriented box enclosing the region, used to test it.
		 * @type {OBB|null}
		 */
		this.regionObb = null;

	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} radius
	 * @param {Float64Array} transform
	 */
	setSphereData( x, y, z, radius, transform ) {

		this.sphere = {
			center: transformPoint( transform, x, y, z, new Vec3() ),
			radius: radius * getMaxScale( transform ),
		};

	}

	/**
	 * @param {Array<number>} data - The 12 numbers of a 3D Tiles `box`: center, then the x, y and z
	 * half-axis vectors.
	 * @param {Float64Array} transform
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

		// the oriented frame the box exists in, placed in the tileset frame by the tile transform
		const frame = obb.transform;
		frame[ 0 ] = _vecX.x;
		frame[ 1 ] = _vecX.y;
		frame[ 2 ] = _vecX.z;
		frame[ 4 ] = _vecY.x;
		frame[ 5 ] = _vecY.y;
		frame[ 6 ] = _vecY.z;
		frame[ 8 ] = _vecZ.x;
		frame[ 9 ] = _vecZ.y;
		frame[ 10 ] = _vecZ.z;
		frame[ 12 ] = data[ 0 ];
		frame[ 13 ] = data[ 1 ];
		frame[ 14 ] = data[ 2 ];
		multiplyMatrices( transform, frame, frame );

		// scale the box by the extents
		obb.min.set( - scaleX, - scaleY, - scaleZ );
		obb.max.set( scaleX, scaleY, scaleZ );
		obb.update();
		this.obb = obb;

	}

	/**
	 * Sets the volume from the 3D Tiles `region` data. Regions are not affected by the tile
	 * transform.
	 * @param {Ellipsoid} ellipsoid - The ellipsoid the region is on.
	 * @param {number} west
	 * @param {number} south
	 * @param {number} east
	 * @param {number} north
	 * @param {number} minHeight
	 * @param {number} maxHeight
	 */
	setRegionData( ellipsoid, west, south, east, north, minHeight, maxHeight ) {

		const { radius } = ellipsoid;
		const region = new EllipsoidRegion( radius.x, radius.y, radius.z, south, north, west, east, minHeight, maxHeight );

		const obb = new OBB();
		region.getBoundingBox( obb.min, obb.max, obb.transform );
		obb.update();

		this.region = region;
		this.regionObb = obb;

	}

	/**
	 * Writes a sphere enclosing the volume into `target`.
	 * @param {{ center: Vec3, radius: number }} target
	 * @returns {{ center: Vec3, radius: number }}
	 */
	getSphere( target ) {

		const { sphere } = this;
		const obb = this.obb || this.regionObb;
		if ( sphere ) {

			target.center.copy( sphere.center );
			target.radius = sphere.radius;

		} else if ( obb ) {

			// the box is centered on the origin of its frame
			const { center } = target;
			const { points } = obb;
			transformPoint( obb.transform, 0, 0, 0, center );
			target.radius = 0;
			for ( let i = 0; i < 24; i += 3 ) {

				target.radius = Math.max( target.radius, Math.hypot( points[ i ] - center.x, points[ i + 1 ] - center.y, points[ i + 2 ] - center.z ) );

			}

		} else {

			target.center.set( 0, 0, 0 );
			target.radius = 0;

		}

		return target;

	}

	/**
	 * Returns the distance from the volume to the point, or 0 when the point is inside.
	 * @param {Vec3} point
	 * @returns {number}
	 */
	distanceToPoint( point ) {

		const { sphere } = this;
		const obb = this.obb || this.regionObb;

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
	 * @param {CameraFrustum} frustum
	 * @returns {boolean}
	 */
	intersectsFrustum( frustum ) {

		const { sphere } = this;
		const obb = this.obb || this.regionObb;

		if ( sphere && ! frustum.intersectsSphere( sphere.center, sphere.radius ) ) {

			return false;

		}

		if ( obb && ! obb.intersectsFrustum( frustum ) ) {

			return false;

		}

		// if we don't have a sphere or obb then just say we did intersect
		return Boolean( sphere || obb );

	}

}
