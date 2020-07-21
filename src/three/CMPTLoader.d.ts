import { B3DMBaseResult } from '../base/B3DMLoaderBase';
import { I3DMBaseResult } from '../base/I3DMLoaderBase';
import { PNTSBaseResult } from '../base/B3DMLoaderBase';
import { Group } from 'three';
import { DracoLoader } from 'three/examples/jsm/loaders/DracoLoader';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult, I3DMBaseResult, PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader {

	dracoLoader : DracoLoader | null;
	ddsLoader : DDSLoader | null;
	ktx2Loader : KTX2Loader | null;
	
	constructor( manager : LoadingManager );
	load( url : String ) : Promise< CMPTResult >;
	parse( buffer : ArrayBuffer ) : CMPTResult;

	setDracoLoader( loader : DracoLoader | null ) : void;
	setDDSLoader( loader : DDSLoader | null ) : void;
	setKTX2Loader( loader : KTX2Loader | null ) : void;

}
