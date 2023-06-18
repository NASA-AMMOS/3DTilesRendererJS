import { Vector3 } from 'three';
import { WGS84_RADIUS, WGS84_HEIGHT } from './Ellipsoid.js';

const vecX = new Vector3();
const vecY = new Vector3();
const vecZ = new Vector3();
export class TileBoundingVolume {

	constructor() {

		this.sphere = null;
		this.obb = null;
		this.region = null;

		this.regionObb = null;

	}

	intersectRay( ray, target ) {

	}

	distanceToPoint( point ) {

	}

	intersectsFrustum( frustum ) {

		const obb = this.obb || this.regionObb;
		const sphere = this.sphere;

		let intersected = Boolean( sphere || obb );
		if ( sphere && ! frustum.intersectsSphere( sphere ) ) {

			intersected = false;

		}

		if ( obb && ! obb.intersectsFrustum( frustum ) ) {

			intersected = false;

		}

		return intersected;

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

	computeDerivedVolumes() {

		if ( this.region && ! this.sphere && ! this.obb ) {

			const obb = new OBB();
			region.getBoundingBox( obb.box, obb.transform );
			obb.update();

			this.regionObb = obb;

		}

	}

	setObbData( data, transform ) {

		const obb = new OBB();

		// get the extents of the bounds in each axis
		vecX.set( data[ 3 ], data[ 4 ], data[ 5 ] );
		vecY.set( data[ 6 ], data[ 7 ], data[ 8 ] );
		vecZ.set( data[ 9 ], data[ 10 ], data[ 11 ] );

		const scaleX = vecX.length();
		const scaleY = vecY.length();
		const scaleZ = vecZ.length();

		vecX.normalize();
		vecY.normalize();
		vecZ.normalize();

		// handle the case where the box has a dimension of 0 in one axis
		if ( scaleX === 0 ) {

			vecX.crossVectors( vecY, vecZ );

		}

		if ( scaleY === 0 ) {

			vecY.crossVectors( vecX, vecZ );

		}

		if ( scaleZ === 0 ) {

			vecZ.crossVectors( vecX, vecY );

		}

		// create the oriented frame that the box exists in
		obb.transform
			.set(
				vecX.x, vecY.x, vecZ.x, data[ 0 ],
				vecX.y, vecY.y, vecZ.y, data[ 1 ],
				vecX.z, vecY.z, vecZ.z, data[ 2 ],
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
		sphere.center.set( data[ 0 ], data[ 1 ], data[ 2 ] );
		sphere.radius = data[ 3 ];
		sphere.applyMatrix4( transform );
		this.sphere = sphere;

	}

	setRegionData( west, south, east, north, minHeight, maxHeight ) {

		this.region = new EllipsoidRegion(
			WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT,
			south, north,
			west, east,
			minHeight, maxHeight,
		);

	}

}
