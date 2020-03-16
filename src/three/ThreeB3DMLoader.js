import { B3DMLoader } from '../base/B3DMLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ThreeB3DMLoader extends B3DMLoader {

	parse( buffer ) {

		const b3dm = super.parse( buffer );
		const gltfBuffer = b3dm.glbBytes.slice().buffer;
		return new Promise( ( resolve, reject ) => {

			new GLTFLoader().parse( gltfBuffer, null, resolve, reject );

		} );

	}

}

export { ThreeB3DMLoader };
