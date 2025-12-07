import { TilesRendererBase } from '3d-tiles-renderer/core';
import { Scene, TransformNode } from 'babylonjs';

export class TilesRenderer extends TilesRendererBase {

	group: TransformNode;
	constructor( url: string, scene: Scene );

}
