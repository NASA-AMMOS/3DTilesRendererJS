import { B3DMLoaderBase } from '../base/B3DMLoaderBase.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class B3DMLoader extends B3DMLoaderBase {

	parse( buffer ) {

		const b3dm = super.parse( buffer );
		const gltfBuffer = b3dm.glbBytes.slice().buffer;
		return new Promise( ( resolve, reject ) => {

			new GLTFLoader().parse( gltfBuffer, null, resolve, reject );

		} );

	}

}
