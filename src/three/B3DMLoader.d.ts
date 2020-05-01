import { B3MLoaderBase } from '../base/B3DMLoaderBase';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export interface B3DMResult extends GLTF {

	batchTable : Object;
	featureTable : Object;

}

export class B3DMLoader extends B3MLoaderBase {

	load( url : String ) : Promise< B3DMResult >;
	parse( buffer : ArrayBuffer ) : B3DMResult;

}
