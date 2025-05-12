import { B3DMBaseResult } from '../../base/loaders/B3DMLoaderBase.js';
import { I3DMBaseResult } from '../../base/loaders/I3DMLoaderBase.js';
import { PNTSBaseResult } from '../../base/loaders/PNTSLoaderBase.js';
import { Group, LoadingManager } from 'three';
import { CMPTLoaderBase } from '../../base/loaders/CMPTLoaderBase.js';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult|I3DMBaseResult|PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader<Result extends CMPTResult = CMPTResult, ParseResult = Promise<Result>>
	extends CMPTLoaderBase<Result, ParseResult> {

	constructor( manager : LoadingManager );

}
