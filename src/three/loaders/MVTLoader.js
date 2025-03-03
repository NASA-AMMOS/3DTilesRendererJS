
import {
	Points,
	PointsMaterial,
	BufferGeometry,
	BufferAttribute,
	DefaultLoadingManager,
	Vector3,
	Color,
} from 'three';

export class MVTLoader extends MVTLoaderBase {

	constructor(manager = DefaultLoadingManager) {

		super();
		this.manager = manager;

	}

	parse(buffer) {

		return super.parse(buffer).then(async (result) => {

			const { vectorTile } = result;

			return result;

		});

	}

}
