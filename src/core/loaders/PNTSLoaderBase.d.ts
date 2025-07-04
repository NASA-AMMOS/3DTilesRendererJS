import { BatchTable } from '../utilities/BatchTable.js';
import { FeatureTable } from '../utilities/FeatureTable.js';
import { LoaderBase } from './LoaderBase.js';

export interface PNTSBaseResult {

	version : string;
	featureTable: FeatureTable;
	batchTable : BatchTable;

}

export class PNTSLoaderBase<Result = PNTSBaseResult, ParseResult = Result>
	extends LoaderBase<Result, ParseResult> {

}
