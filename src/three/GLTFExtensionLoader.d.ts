
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoadingManager } from 'three';

export class GLTFExtensionLoader {

	constructor( manager : LoadingManager );
	parse( buffer : ArrayBuffer ) : Promise< GLTF >;

}
