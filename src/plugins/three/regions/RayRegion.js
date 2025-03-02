import { Ray } from 'three';

const _rayLocal = new Ray();

export class RayRegion {

	constructor( ray = new Ray(), errorTarget = 10 ) {

		this.ray = ray;
		this.errorTarget = errorTarget;

	}

	intersectsTile( boundingVolume, tile, matrixWorldInverse ) {

		_rayLocal.copy( this.ray ).applyMatrix4( matrixWorldInverse );
		const intersect = boundingVolume.intersectsRay( _rayLocal );
		if ( intersect ) {

			tile.__inRegion = intersect;

		}
		return intersect;

	}

	calculateError( tile, errorTarget ) {

		return tile.geometricError - this.errorTarget + errorTarget;

	}

}
