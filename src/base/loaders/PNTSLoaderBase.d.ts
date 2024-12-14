import { BatchTable } from '../../utilities/BatchTable';
import { FeatureTable } from '../../utilities/FeatureTable';

export interface PNTSBaseResult {

	version : string;
	featureTable: FeatureTable;
	batchTable : BatchTable;

}

export class PNTSLoaderBase {

	load( url : string ) : Promise< PNTSBaseResult >;
	parse( buffer : ArrayBuffer ) : Promise< PNTSBaseResult >;

}
