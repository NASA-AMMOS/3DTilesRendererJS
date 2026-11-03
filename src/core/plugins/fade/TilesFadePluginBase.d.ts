import { Tile } from '3d-tiles-renderer/core';

export class TilesFadePluginBase {

	fadeDuration: number;
	maximumFadeOutTiles: number;
	fadeRootTiles: boolean;
	readonly fadingTiles: number;

	constructor( options?: {
		maximumFadeOutTiles?: number,
		fadeRootTiles?: boolean,
		fadeDuration?: number,
	} );

	prepareTileScene( scene: object, tile: Tile ): void;
	releaseTileScene( scene: object, tile: Tile ): void;
	setFadeState( tile: Tile, fadeIn: number, fadeOut: number ): void;
	resetFadeState( tile: Tile, visible: boolean ): void;
	updateCameraState( checkMovement: boolean ): boolean;

}
