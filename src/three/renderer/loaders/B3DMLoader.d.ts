import { B3DMBaseResult, B3DMLoaderBase } from '../../../core/renderer/loaders/B3DMLoaderBase.js';
import { BatchTable } from '../../../core/renderer/utilities/BatchTable.js';
import { FeatureTable } from '../../../core/renderer/utilities/FeatureTable.js';
import { LoadingManager, Group } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface B3DMScene extends Group {

	batchTable : BatchTable;
	featureTable : FeatureTable;

}

export interface B3DMResult extends GLTF, B3DMBaseResult {

	scene : B3DMScene;

}

export class B3DMLoader<Result extends B3DMResult = B3DMResult, ParseResult = Promise<Result>>
	extends B3DMLoaderBase<Result, ParseResult> {

	constructor( manager : LoadingManager );

}
