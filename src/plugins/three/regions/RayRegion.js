import { Ray } from 'three';

export class RayRegion {

	constructor( ray = new Ray(), errorTarget = 10 ) {

		this.ray = ray.clone();
		this.errorTarget = errorTarget;

	}

	intersectsTile( boundingVolume, tile ) {

		return boundingVolume.intersectsRay( this.ray );

	}

	calculateError( tile, errorTarget ) {

		return tile.geometricError - this.errorTarget + errorTarget;

	}

}
