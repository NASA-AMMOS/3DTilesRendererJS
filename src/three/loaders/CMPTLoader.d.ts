import { B3DMBaseResult } from '../../base/loaders/B3DMLoaderBase.js';
import { I3DMBaseResult } from '../../base/loaders/I3DMLoaderBase.js';
import { PNTSBaseResult } from '../../base/loaders/PNTSLoaderBase.js';
import { Group, LoadingManager } from 'three';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult|I3DMBaseResult|PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader {

	constructor( manager : LoadingManager );
	load( url : string ) : Promise< CMPTResult >;
	parse( buffer : ArrayBuffer ) : Promise< CMPTResult >;

}
