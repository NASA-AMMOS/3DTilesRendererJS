import { Material, WebGLRenderer } from 'three';

export class BatchedTilesPlugin {

	constructor( options : {
		instanceCount: number,
		vertexCount: number,
		indexCount: number,
		expandPercent: number,
		maxInstanceCount: number,
		discardOriginalContent: boolean,
		textureSize: number | null,

		material: Material | null,
		renderer: WebGLRenderer | null,
	} );

}
