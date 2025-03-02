import { Frustum, Sphere } from 'three';

const _frustum = new Frustum();
export class SphereRegion {

	constructor( sphere = new Sphere(), errorTarget = 10 ) {

		this.sphere = sphere.clone();
		this.errorTarget = errorTarget;

	}

	intersectsTile( boundingVolume, tile ) {

		const obb = boundingVolume.obb || boundingVolume.regionObb;
		const sphere = boundingVolume.sphere;
		if ( sphere && sphere.intersectsSphere( sphere ) ) {

			return true;

		}

		if ( obb ) {

			_frustum.set( ...obb.planes );

			if ( _frustum.intersectsSphere( sphere ) ) {

				return true;

			}

		}

		return false;

	}

	calculateError( tile, errorTarget ) {

		return tile.geometricError - this.errorTarget + errorTarget;

	}

}
