import { PNTSBaseResult, PNTSLoaderBase } from '../base/PNTSLoaderBase';
import { FeatureTable } from '../utilities/FeatureTable';
import { Points, LoadingManager } from 'three';

interface PNTSScene extends Points {

	featureTable : FeatureTable;
	
}

export interface PNTSResult extends PNTSBaseResult {

	scene : PNTSScene;

}

export class PNTSLoader extends PNTSLoaderBase {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< PNTSResult >;
	parse( buffer : ArrayBuffer ) : Promise< PNTSResult >;

}
