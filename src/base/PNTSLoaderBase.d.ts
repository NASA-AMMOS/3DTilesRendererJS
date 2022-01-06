import { FeatureTable, BatchTable } from '../utilities/FeatureTable';

export interface PNTSBaseResult {

	version : String;
	featureTable: FeatureTable;
	batchTable : BatchTable;

}

export class PNTSLoaderBase {

	load( url : string ) : Promise< PNTSBaseResult >;
	parse( buffer : ArrayBuffer ) : Promise< PNTSBaseResult >;

}
