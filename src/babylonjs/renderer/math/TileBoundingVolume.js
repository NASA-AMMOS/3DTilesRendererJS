import { Vector3, Matrix, BoundingSphere } from '@babylonjs/core';
import { OBB } from './OBB.js';

const _vecX = /* @__PURE__ */ new Vector3();
const _vecY = /* @__PURE__ */ new Vector3();
const _vecZ = /* @__PURE__ */ new Vector3();
const _scale = /* @__PURE__ */ new Vector3();
const _empty = /* @__PURE__ */ new Vector3();

export class TileBoundingVolume {

	constructor() {

		this.sphere = null;
		this.obb = null;

	}

	setSphereData( x, y, z, radius, transform ) {

		const sphere = new BoundingSphere( _empty, _empty );

		const center = sphere.centerWorld.set( x, y, z );
		Vector3.TransformCoordinatesToRef( center, transform, center );

		transform.decompose( _scale, null, null );
		sphere.radiusWorld = radius * Math.max( Math.abs( _scale.x ), Math.abs( _scale.y ), Math.abs( _scale.z ) );

		this.sphere = sphere;

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
		obb.transform = Matrix
			.FromValues(
				_vecX.x, _vecY.x, _vecZ.x, data[ 0 ],
				_vecX.y, _vecY.y, _vecZ.y, data[ 1 ],
				_vecX.z, _vecY.z, _vecZ.z, data[ 2 ],
				0, 0, 0, 1,
			)
			.transpose()
			.multiply( transform );

		// scale the box by the extents
		obb.min.set( - scaleX, - scaleY, - scaleZ );
		obb.max.set( scaleX, scaleY, scaleZ );
		obb.update();
		this.obb = obb;

	}

	distanceToPoint( point ) {

		const { sphere, obb } = this;

		let sphereDistance = - Infinity;
		let obbDistance = - Infinity;

		if ( sphere ) {

			sphereDistance = Vector3.Distance( point, sphere.centerWorld ) - sphere.radiusWorld;
			sphereDistance = Math.max( sphereDistance, 0 );

		}

		if ( obb ) {

			obbDistance = obb.distanceToPoint( point );

		}

		// return the further distance of the two volumes
		return sphereDistance > obbDistance ? sphereDistance : obbDistance;

	}

	intersectsFrustum( frustumPlanes ) {

		const { sphere, obb } = this;

		if ( sphere && ! sphere.isInFrustum( frustumPlanes ) ) {

			return false;

		}

		if ( obb && ! obb.intersectsFrustum( frustumPlanes ) ) {

			return false;

		}

		// if we don't have a sphere or obb then just say we did intersect
		return Boolean( sphere || obb );

	}

}
