import { BatchTable } from '../../utilities/BatchTable';
import { FeatureTable } from '../../utilities/FeatureTable';

export interface B3DMBaseResult {

	version : string;
	featureTable: FeatureTable;
	batchTable : BatchTable;
	glbBytes : Uint8Array;

}

export class B3DMLoaderBase {

	load( url : string ) : Promise< B3DMBaseResult >;
	parse( buffer : ArrayBuffer ) : B3DMBaseResult;

}
