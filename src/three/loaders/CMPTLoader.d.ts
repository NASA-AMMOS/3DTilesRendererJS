import { B3DMBaseResult } from '../../core/loaders/B3DMLoaderBase.js';
import { I3DMBaseResult } from '../../core/loaders/I3DMLoaderBase.js';
import { PNTSBaseResult } from '../../core/loaders/PNTSLoaderBase.js';
import { Group, LoadingManager } from 'three';
import { CMPTLoaderBase } from '../../core/loaders/CMPTLoaderBase.js';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult|I3DMBaseResult|PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader<Result extends CMPTResult = CMPTResult, ParseResult = Promise<Result>>
	extends CMPTLoaderBase<Result, ParseResult> {

	constructor( manager : LoadingManager );

}
