import { B3DMBaseResult } from '../../base/loaders/B3DMLoaderBase';
import { I3DMBaseResult } from '../../base/loaders/I3DMLoaderBase';
import { PNTSBaseResult } from '../../base/loaders/PNTSLoaderBase';
import { Group, LoadingManager, Matrix4 } from 'three';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult|I3DMBaseResult|PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader {

	constructor( adjustmentTransform: Matrix4, manager : LoadingManager );
	load( url : String ) : Promise< CMPTResult >;
	parse( buffer : ArrayBuffer ) : Promise< CMPTResult >;

}
