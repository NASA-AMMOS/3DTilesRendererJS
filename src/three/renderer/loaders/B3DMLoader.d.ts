import { B3DMBaseResult, B3DMLoaderBase, BatchTable, FeatureTable } from '3d-tiles-renderer/core';
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
