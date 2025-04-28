import { BatchTable } from '../../utilities/BatchTable.js';
import { FeatureTable } from '../../utilities/FeatureTable.js';

export interface PNTSBaseResult {

	version : string;
	featureTable: FeatureTable;
	batchTable : BatchTable;

}

export class PNTSLoaderBase {

	load( url : string ) : Promise< PNTSBaseResult >;
	parse( buffer : ArrayBuffer ) : Promise< PNTSBaseResult >;

}
