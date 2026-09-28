import { TilesRendererBase, TilesRendererBaseEventMap } from '3d-tiles-renderer/core';
import { Scene } from '@babylonjs/core/scene.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';

export class TilesRenderer extends TilesRendererBase<TilesRendererBaseEventMap<TransformNode>> {

	group: TransformNode;
	checkCollisions: boolean;

	constructor( url: string, scene: Scene );

}
