import { PNTSBaseResult } from '../base/PNTSLoaderBase';
import { FeatureTable } from '../utilities/FeatureTable';
import { Points } from 'three';

interface PNTSScene extends Point {

	featureTable : FeatureTable;
	
}

export interface PNTSResult extends PNTSBaseResult {

	scene : PNTSScene;

}

export class PNTSLoader {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< PNTSResult >;
	parse( buffer : ArrayBuffer ) : PNTSResult;

}
