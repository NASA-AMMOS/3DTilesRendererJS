import { I3DMBaseResult } from '../base/I3DMLoaderBase';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

interface I3DMScene extends Group {

	batchTable : Object;
	featureTable : Object;
	
}

export interface I3DMResult extends GLTF, I3DMBaseResult {

	scene : I3DMScene;

}

export class I3DMLoader {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< I3DMResult >;
	parse( buffer : ArrayBuffer ) : I3DMResult;
	
}
