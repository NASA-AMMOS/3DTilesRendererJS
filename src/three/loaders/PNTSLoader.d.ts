import { PNTSBaseResult, PNTSLoaderBase } from '../../core/loaders/PNTSLoaderBase.js';
import { BatchTable } from '../../core/core/utilities/BatchTable.js';
import { FeatureTable } from '../../core/core/utilities/FeatureTable.js';
import { Points, LoadingManager } from 'three';

interface PNTSScene extends Points {

	batchTable : BatchTable
	featureTable : FeatureTable;

}

export interface PNTSResult extends PNTSBaseResult {

	scene : PNTSScene;

}

export class PNTSLoader<Result extends PNTSResult = PNTSResult, ParseResult = Promise<Result>>
	extends PNTSLoaderBase<Result, ParseResult> {

	constructor( manager : LoadingManager );

}
