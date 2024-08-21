import { Vector3, Sphere } from 'three';
import { WGS84_RADIUS, WGS84_HEIGHT } from '../../base/constants.js';
import { OBB } from './OBB.js';
import { EllipsoidRegion } from './EllipsoidRegion.js';

const _vecX = new Vector3();
const _vecY = new Vector3();
const _vecZ = new Vector3();
const _sphereVec = new Vector3();
const _obbVec = new Vector3();

// TODO: check region more precisely in all functions
export class TileBoundingVolume {

	constructor() {

		this.sphere = null;
		this.obb = null;
		this.region = null;

		this.regionObb = null;

	}

	intersectsRay( ray ) {

		const sphere = this.sphere;
		const obb = this.obb || this.regionObb;

		// Early out if we don't hit this tile sphere
		if ( sphere && ! ray.intersectsSphere( sphere ) ) {

			return false;

		}

		// Early out if we don't this this tile box
		if ( obb && ! obb.intersectsRay( ray ) ) {

			return false;

		}

		return true;

	}

	intersectRay( ray, target = null ) {

		const sphere = this.sphere;
		const obb = this.obb || this.regionObb;

		let sphereDistSq = - Infinity;
		let obbDistSq = - Infinity;

		if ( sphere ) {

			if ( ray.intersectSphere( sphere, _sphereVec ) ) {

				sphereDistSq = sphere.containsPoint( ray.origin ) ? 0 : ray.origin.distanceToSquared( _sphereVec );

			}

		}

		if ( obb ) {

			if ( obb.intersectRay( ray, _obbVec ) ) {

				obbDistSq = obb.containsPoint( ray.origin ) ? 0 : ray.origin.distanceToSquared( _obbVec );

			}

		}

		// if we didn't hit anything then exit
		const furthestDist = Math.max( sphereDistSq, obbDistSq );
		if ( furthestDist === - Infinity ) {

			return null;

		}

		// get the furthest hit point if needed
		ray.at( Math.sqrt( furthestDist ), target );
		return target;

	}

	distanceToPoint( point ) {

		const sphere = this.sphere;
		const obb = this.obb || this.regionObb;

		let sphereDistance = - Infinity;
		let obbDistance = - Infinity;

		if ( sphere ) {

			// Sphere#distanceToPoint is negative inside the sphere, whereas Box3#distanceToPoint is
			// zero inside the box. Clipping the distance to a minimum of zero ensures that both
			// types of bounding volume behave the same way.
			sphereDistance = Math.max( sphere.distanceToPoint( point ), 0 );

		}

		if ( obb ) {

			obbDistance = obb.distanceToPoint( point );

		}

		// return the further distance of the two volumes
		return sphereDistance > obbDistance ? sphereDistance : obbDistance;

	}

	intersectsFrustum( frustum ) {

		const obb = this.obb || this.regionObb;
		const sphere = this.sphere;
		if ( sphere && ! frustum.intersectsSphere( sphere ) ) {

			return false;

		}

		if ( obb && ! obb.intersectsFrustum( frustum ) ) {

			return false;

		}

		// if we don't have a sphere or obb then just say we did intersect
		return Boolean( sphere || obb );

	}

	getOBB( targetBox, targetMatrix ) {

		const obb = this.obb || this.regionObb;
		if ( obb ) {

			targetBox.copy( obb.box );
			targetMatrix.copy( obb.transform );

		} else {

			this.getAABB( targetBox );
			targetMatrix.identity();

		}

	}

	getAABB( target ) {

		if ( this.sphere ) {

			this.sphere.getBoundingBox( target );

		} else {

			const obb = this.obb || this.regionObb;
			target.copy( obb.box ).applyMatrix4( obb.transform );

		}

	}

	getSphere( target ) {

		if ( this.sphere ) {

			target.copy( this.sphere );

		} else if ( this.region ) {

			this.region.getBoundingSphere( target );

		} else {

			const obb = this.obb || this.regionObb;
			obb.box.getBoundingSphere( target );
			target.applyMatrix4( obb.transform );

		}

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

			_vecX.crossVectors( _vecY, _vecZ );

		}

		if ( scaleY === 0 ) {

			_vecY.crossVectors( _vecX, _vecZ );

		}

		if ( scaleZ === 0 ) {

			_vecZ.crossVectors( _vecX, _vecY );

		}

		// create the oriented frame that the box exists in
		obb.transform
			.set(
				_vecX.x, _vecY.x, _vecZ.x, data[ 0 ],
				_vecX.y, _vecY.y, _vecZ.y, data[ 1 ],
				_vecX.z, _vecY.z, _vecZ.z, data[ 2 ],
				0, 0, 0, 1
			)
			.premultiply( transform );

		// scale the box by the extents
		obb.box.min.set( - scaleX, - scaleY, - scaleZ );
		obb.box.max.set( scaleX, scaleY, scaleZ );
		obb.update();
		this.obb = obb;

	}

	setSphereData( x, y, z, radius, transform ) {

		const sphere = new Sphere();
		sphere.center.set( x, y, z );
		sphere.radius = radius;
		sphere.applyMatrix4( transform );
		this.sphere = sphere;

	}

	setRegionData( west, south, east, north, minHeight, maxHeight ) {

		const region = new EllipsoidRegion(
			WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT,
			south, north,
			west, east,
			minHeight, maxHeight,
		);

		const obb = new OBB();
		region.getBoundingBox( obb.box, obb.transform );
		obb.update();

		this.region = region;
		this.regionObb = obb;

	}

}
