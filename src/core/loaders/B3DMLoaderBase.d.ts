import { BatchTable } from '../utilities/BatchTable.js';
import { FeatureTable } from '../utilities/FeatureTable.js';
import { LoaderBase } from './LoaderBase.js';

export interface B3DMBaseResult {

	version : string;
	featureTable: FeatureTable;
	batchTable : BatchTable;
	glbBytes : Uint8Array;

}

export class B3DMLoaderBase<Result = B3DMBaseResult, ParseResult = Result>
	extends LoaderBase<Result, ParseResult> {

}
