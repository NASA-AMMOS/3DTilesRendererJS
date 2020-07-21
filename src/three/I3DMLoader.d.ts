import { I3DMBaseResult } from '../base/I3DMLoaderBase';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export interface I3DMResult extends GLTF, I3DMBaseResult {

	batchTable : Object;
	featureTable : Object;

}

export class I3DMLoader {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< I3DMResult >;
	parse( buffer : ArrayBuffer ) : I3DMResult;
	
}
