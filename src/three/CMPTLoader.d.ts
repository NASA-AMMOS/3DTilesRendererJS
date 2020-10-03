import { B3DMBaseResult } from '../base/B3DMLoaderBase';
import { I3DMBaseResult } from '../base/I3DMLoaderBase';
import { PNTSBaseResult } from '../base/PNTSLoaderBase';
import { Group } from 'three';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult|I3DMBaseResult|PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader {
	
	constructor( manager : LoadingManager );
	load( url : String ) : Promise< CMPTResult >;
	parse( buffer : ArrayBuffer ) : CMPTResult;

}
