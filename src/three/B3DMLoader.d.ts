import { B3DMBaseResult } from '../base/B3DMLoaderBase';
import { LoadingManager } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { DracoLoader } from 'three/examples/jsm/loaders/DracoLoader';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

export interface B3DMResult extends GLTF, B3DMBaseResult {}

export class B3DMLoader {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< B3DMResult >;
	parse( buffer : ArrayBuffer ) : B3DMResult;
	
	setDracoLoader( loader : DracoLoader | null ) : void;
	setDDSLoader( loader : DDSLoader | null ) : void;
	setKTX2Loader( loader : KTX2Loader | null ) : void;

}
