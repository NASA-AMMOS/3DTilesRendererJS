import { Frustum, Sphere } from 'three';

const _frustum = new Frustum();
const _sphereLocal = new Sphere();

export class SphereRegion {

	constructor( sphere ) {

		this.sphere = sphere;

	}

	intersectsTile( boundingVolume, matrixWorldInverse ) {

		_sphereLocal.copy( this.sphere ).applyMatrix4( matrixWorldInverse );
		const obb = boundingVolume.obb || boundingVolume.regionObb;
		const sphere = boundingVolume.sphere;


		if ( sphere && sphere.intersectsSphere( _sphereLocal ) ) {

			return true;

		}

		if ( obb ) {

			_frustum.set( ...obb.planes );

			if ( _frustum.intersectsSphere( _sphereLocal ) ) {

				return true;

			}

		}

	}

}
