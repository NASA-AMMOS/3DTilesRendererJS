import { FeatureTable, BatchTable } from '../utilities/FeatureTable';

export interface B3DMBaseResult {

	version : String;
	featureTable: FeatureTable;
	batchTable : BatchTable;
	glbBytes : Uint8Array;

}

export class B3DMLoaderBase {

	load( url : string ) : Promise< B3DMBaseResult >;
	parse( buffer : ArrayBuffer ) : B3DMBaseResult;

}
