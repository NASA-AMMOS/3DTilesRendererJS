import { PNTSBaseResult, PNTSLoaderBase } from '../../../core/renderer/loaders/PNTSLoaderBase.js';
import { BatchTable } from '../../../core/renderer/utilities/BatchTable.js';
import { FeatureTable } from '../../../core/renderer/utilities/FeatureTable.js';
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
