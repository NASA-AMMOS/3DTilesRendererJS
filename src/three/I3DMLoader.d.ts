import { I3DMBaseResult } from '../base/I3DMLoaderBase';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { DracoLoader } from 'three/examples/jsm/loaders/DracoLoader';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

export interface I3DMResult extends GLTF, I3DMBaseResult {

	batchTable : Object;
	featureTable : Object;

}

export class I3DMLoader {
	
	constructor( manager : LoadingManager );
	load( url : String ) : Promise< I3DMResult >;
	parse( buffer : ArrayBuffer ) : I3DMResult;

	setDracoLoader( loader : DracoLoader | null ) : void;
	setDDSLoader( loader : DDSLoader | null ) : void;
	setKTX2Loader( loader : KTX2Loader | null ) : void;
	
}
