import { B3DMBaseResult } from '../../../core/renderer/loaders/B3DMLoaderBase.js';
import { I3DMBaseResult } from '../../../core/renderer/loaders/I3DMLoaderBase.js';
import { PNTSBaseResult } from '../../../core/renderer/loaders/PNTSLoaderBase.js';
import { Group, LoadingManager } from 'three';
import { CMPTLoaderBase } from '../../../core/renderer/loaders/CMPTLoaderBase.js';

export interface CMPTResult {

	tiles : Array< B3DMBaseResult|I3DMBaseResult|PNTSBaseResult >;
	scene : Group;

}

export class CMPTLoader<Result extends CMPTResult = CMPTResult, ParseResult = Promise<Result>>
	extends CMPTLoaderBase<Result, ParseResult> {

	constructor( manager : LoadingManager );

}
