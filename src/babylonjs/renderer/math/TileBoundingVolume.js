import { Vector3, Matrix, BoundingInfo } from '@babylonjs/core';
import { OBB } from './OBB.js';

const _vecX = /* @__PURE__ */ new Vector3();
const _vecY = /* @__PURE__ */ new Vector3();
const _vecZ = /* @__PURE__ */ new Vector3();
const _scale = /* @__PURE__ */ new Vector3();
const _min = /* @__PURE__ */ new Vector3();
const _max = /* @__PURE__ */ new Vector3();
const _center = /* @__PURE__ */ new Vector3();

export class TileBoundingVolume {

	constructor() {

		// Use BoundingInfo for sphere - respects large world rendering
		this.sphereInfo = null;
		this.obb = null;

	}

	setSphereData( x, y, z, radius, transform ) {

		// Transform center to world space
		_center.set( x, y, z );
		Vector3.TransformCoordinatesToRef( _center, transform, _center );

		// Get scale for radius
		transform.decompose( _scale, null, null );
		const worldRadius = radius * Math.max( Math.abs( _scale.x ), Math.abs( _scale.y ), Math.abs( _scale.z ) );

		// Create BoundingInfo as a sphere (min=max=center creates a point, so we offset by radius)
		_min.set( _center.x - worldRadius, _center.y - worldRadius, _center.z - worldRadius );
		_max.set( _center.x + worldRadius, _center.y + worldRadius, _center.z + worldRadius );
		this.sphereInfo = new BoundingInfo( _min, _max );

	}

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

			Vector3.CrossToRef( _vecY, _vecZ, _vecX );

		}

		if ( scaleY === 0 ) {

			Vector3.CrossToRef( _vecX, _vecZ, _vecY );

		}

		if ( scaleZ === 0 ) {

			Vector3.CrossToRef( _vecX, _vecY, _vecZ );

		}

		// create the oriented frame that the box exists in
		// Note that Babylon seems to take data in column major ordering rather than row-major like three.js
		// (despite the docs seeming to imply that it's row major) so we transpose afterward
		const obbTransform = Matrix
			.FromValues(
				_vecX.x, _vecY.x, _vecZ.x, data[ 0 ],
				_vecX.y, _vecY.y, _vecZ.y, data[ 1 ],
				_vecX.z, _vecY.z, _vecZ.z, data[ 2 ],
				0, 0, 0, 1,
			)
			.transpose()
			.multiply( transform );

		// Set up the OBB using Babylon's BoundingInfo with the world matrix
		_min.set( - scaleX, - scaleY, - scaleZ );
		_max.set( scaleX, scaleY, scaleZ );
		obb.setFromMinMax( _min, _max, obbTransform );

		this.obb = obb;

	}

	distanceToPoint( point ) {

		const { sphereInfo, obb } = this;

		let sphereDistance = - Infinity;
		let obbDistance = - Infinity;

		if ( sphereInfo ) {

			// Use BoundingSphere from BoundingInfo
			const sphere = sphereInfo.boundingSphere;
			const center = sphere.centerWorld;

			// Distance calculation - Babylon's types should handle precision with large world mode
			const dx = point.x - center.x;
			const dy = point.y - center.y;
			const dz = point.z - center.z;
			const dist = Math.sqrt( dx * dx + dy * dy + dz * dz );
			sphereDistance = Math.max( dist - sphere.radiusWorld, 0 );

		}

		if ( obb ) {

			obbDistance = obb.distanceToPoint( point );

		}

		// return the further distance of the two volumes
		return sphereDistance > obbDistance ? sphereDistance : obbDistance;

	}

	intersectsFrustum( frustumPlanes ) {

		const { sphereInfo, obb } = this;

		// Use Babylon's built-in frustum check - respects large world rendering
		if ( sphereInfo && ! sphereInfo.isInFrustum( frustumPlanes ) ) {

			return false;

		}

		if ( obb && ! obb.intersectsFrustum( frustumPlanes ) ) {

			return false;

		}

		// if we don't have a sphere or obb then just say we did intersect
		return Boolean( sphereInfo || obb );

	}

}
