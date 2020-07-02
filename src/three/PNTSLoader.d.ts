import { PNTSLoaderBase, PNTSBaseResult } from '../base/PNTSLoaderBase';
import { Points } from 'three';

export interface PNTSResult extends PNTSBaseResult {

	scene: Points;

}

export class PNTSLoader extends PNTSLoaderBase {

	load( url : String ) : Promise< PNTSResult >;
	parse( buffer : ArrayBuffer ) : PNTSResult;

}
