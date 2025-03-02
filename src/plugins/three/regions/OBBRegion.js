import { OBB } from '../../../three/math/OBB.js';
import { ExtendedFrustum } from '../../../three/math/ExtendedFrustum.js';

const _frustum = new ExtendedFrustum();
const _obbLocal = new OBB();

export class OBBRegion {

	constructor( obb = new OBB(), errorTarget = 10 ) {

		this.obb = obb;
		this.errorTarget = errorTarget;

	}

	intersectsTile( boundingVolume, tile, matrixWorldInverse ) {

		_obbLocal.box.copy( this.obb.box );
		_obbLocal.transform.copy( this.obb.transform ).premultiply( matrixWorldInverse );
		_obbLocal.updatePlanes();
		_frustum.set( ..._obbLocal.planes );
		_frustum.calculateFrustumPoints();

		const intersect = boundingVolume.intersectsFrustum( _frustum );
		if ( intersect ) {

			tile.__inRegion = intersect;

		}
		return intersect;

	}

	calculateError( tile, errorTarget ) {

		return tile.geometricError - this.errorTarget + errorTarget;

	}

}
