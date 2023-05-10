import {  BatchTable } from '../utilities/FeatureTable';
import { PNTSFeatureTable } from '../utilities/PNTSFeatureTable';

export interface PNTSBaseResult {

	version : String;
	featureTable: PNTSFeatureTable;
	batchTable : BatchTable;

}

export class PNTSLoaderBase {

	load( url : string ) : Promise< PNTSBaseResult >;
	parse( buffer : ArrayBuffer ) : Promise< PNTSBaseResult >;

}
