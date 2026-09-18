export interface TilesFadePluginOptions {

	maximumFadeOutTiles?: number;
	fadeRootTiles?: boolean;
	fadeDuration?: number;

}

export class TilesFadePlugin {

	readonly name: 'FADE_TILES_PLUGIN';
	readonly priority: number;
	fadeDuration: number;
	maximumFadeOutTiles: number;
	fadeRootTiles: boolean;
	readonly fadingTiles: number;

	constructor( options?: TilesFadePluginOptions );

}
