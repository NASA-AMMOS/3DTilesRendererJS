import { PNTSBaseResult, PNTSLoaderBase } from '../../base/loaders/PNTSLoaderBase';
import { BatchTable } from '../../utilities/BatchTable';
import { FeatureTable } from '../../utilities/FeatureTable';
import { Points, LoadingManager } from 'three';

interface PNTSScene extends Points {

	batchTable : BatchTable
	featureTable : FeatureTable;

}

export interface PNTSResult extends PNTSBaseResult {

	scene : PNTSScene;

}

export class PNTSLoader extends PNTSLoaderBase {

	constructor( manager : LoadingManager );
	load( url : string ) : Promise< PNTSResult >;
	parse( buffer : ArrayBuffer ) : Promise< PNTSResult >;

}
