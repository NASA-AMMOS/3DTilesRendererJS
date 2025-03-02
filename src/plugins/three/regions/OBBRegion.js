import { OBB } from '../../../three/math/OBB.js';
import { ExtendedFrustum } from '../../../three/math/ExtendedFrustum.js';

const _frustum = new ExtendedFrustum();
export class OBBRegion {

	constructor( obb = new OBB(), errorTarget = 10 ) {

		this.obb = obb.clone();
		this.errorTarget = errorTarget;

	}

	intersectsTile( boundingVolume, tile ) {

		_frustum.set( ...this.obb.planes );
		_frustum.calculateFrustumPoints();

		return boundingVolume.intersectsFrustum( _frustum );

	}

	calculateError( tile, tilesRenderer ) {

		return tile.geometricError - this.errorTarget + tilesRenderer.errorTarget;

	}

}
