import { OBB } from '../../../three/math/OBB';
import { ExtendedFrustum } from '../../../three/math/ExtendedFrustum';

const _frustum = new ExtendedFrustum();
const _obbLocal = new OBB();

export class OBBRegion {

	constructor( obb ) {

		this.obb = obb;

	}

	intersectsTile( boundingVolume, matrixWorldInverse ) {

		_obbLocal.box.copy( this.obb.box );
		_obbLocal.transform.copy( this.obb.transform ).premultiply( matrixWorldInverse );
		_obbLocal.updatePlanes();
		_frustum.set( ..._obbLocal.planes );
		_frustum.calculateFrustumPoints();

		return boundingVolume.intersectsFrustum( _frustum );

	}

}
