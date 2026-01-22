import { MVTBaseResult, MVTLoaderBase } from '../../base/loaders/MVTLoaderBase';
import { ColorRepresentation, Group, LoadingManager } from 'three';

interface MVTScene extends Group {

	vectorTile: VectorTile

}

export interface MVTResult extends MVTBaseResult {

	scene: MVTScene;

}

export class MVTLoader extends MVTLoaderBase {

	constructor( manager: LoadingManager, styles?: { [ layer: string ]: ColorRepresentation } );
	parse( buffer: ArrayBuffer ): Promise<MVTResult>;

}
