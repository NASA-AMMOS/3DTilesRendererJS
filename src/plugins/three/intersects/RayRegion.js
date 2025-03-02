import { Ray } from 'three';

const _rayLocal = new Ray();

export class RayRegion {

	constructor( ray ) {

		this.ray = ray;

	}

	intersectsTile( boundingVolume, matrixWorldInverse ) {

		_rayLocal.copy( this.ray ).applyMatrix4( matrixWorldInverse );
		return boundingVolume.intersectsRay( _rayLocal );

	}

}
