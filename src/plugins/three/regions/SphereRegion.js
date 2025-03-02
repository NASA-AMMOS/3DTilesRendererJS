import { Frustum, Sphere } from 'three';

const _frustum = new Frustum();
const _sphereLocal = new Sphere();

export class SphereRegion {

	constructor( sphere = new Sphere(), errorTarget = 10 ) {

		this.sphere = sphere;
		this.errorTarget = errorTarget;

	}

	intersectsTile( boundingVolume, tile, matrixWorldInverse ) {

		_sphereLocal.copy( this.sphere ).applyMatrix4( matrixWorldInverse );
		const obb = boundingVolume.obb || boundingVolume.regionObb;
		const sphere = boundingVolume.sphere;


		let intersects = false;
		if ( sphere && sphere.intersectsSphere( _sphereLocal ) ) {

			intersects = true;

		}

		if ( obb ) {

			_frustum.set( ...obb.planes );

			if ( _frustum.intersectsSphere( _sphereLocal ) ) {

				intersects = true;

			}

		}

		if ( intersects ) {

			tile.__inRegion = true;

		}
		return intersects;

	}

	calculateError( tile, errorTarget ) {

		return tile.geometricError - this.errorTarget + errorTarget;

	}

}
