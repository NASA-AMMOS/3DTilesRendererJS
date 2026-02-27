import { TilesRendererBase } from '3d-tiles-renderer/core';
import { Scene, TransformNode } from '@babylonjs/core';

export class TilesRenderer extends TilesRendererBase {

	group: TransformNode;
	readonly visibleTiles: Set<object>;
	readonly activeTiles: Set<object>;

	constructor( url: string, scene: Scene );

	addEventListener( name: string, callback: ( event: any ) => void ): void;
	removeEventListener( name: string, callback: ( event: any ) => void ): void;

}
