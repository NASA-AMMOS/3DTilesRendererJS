import { MVTBaseResult, MVTLoaderBase } from '../../base/loaders/MVTLoaderBase';
import { Group, LoadingManager } from 'three';

interface MVTScene extends Group {

	vectorTile: VectorTile

}

export interface MVTResult extends MVTBaseResult {

	scene: MVTScene;

}

export class MVTLoader extends MVTLoaderBase {

	constructor(manager: LoadingManager);
	load(url: string): Promise<MVTResult>;
	parse(buffer: ArrayBuffer): Promise<MVTResult>;

}
