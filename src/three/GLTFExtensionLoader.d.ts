
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoaderBase } from '../base/LoaderBase';
import { LoadingManager } from 'three';

export class GLTFExtensionLoader extends LoaderBase {

	constructor( manager : LoadingManager );
	parse( buffer : ArrayBuffer ) : Promise< GLTF >;

}
