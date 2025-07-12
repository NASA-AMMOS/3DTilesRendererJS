import { I3DMBaseResult, I3DMLoaderBase } from '../../../core/renderer/loaders/I3DMLoaderBase.js';
import { BatchTable } from '../../../core/renderer/utilities/BatchTable.js';
import { FeatureTable } from '../../../core/renderer/utilities/FeatureTable.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, LoadingManager } from 'three';

interface I3DMScene extends Group {

	batchTable : BatchTable;
	featureTable : FeatureTable;

}

export interface I3DMResult extends GLTF, I3DMBaseResult {

	scene : I3DMScene;

}

export class I3DMLoader<Result extends I3DMResult = I3DMResult, ParseResult = Promise<Result>>
	extends I3DMLoaderBase<Result, ParseResult> {

	constructor( manager : LoadingManager );

}
