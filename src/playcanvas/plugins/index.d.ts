import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { TilesFadePluginBase } from '3d-tiles-renderer/core/plugins';

export class ReorientationPlugin {

	constructor( options?: {
		lat?: number | null,
		lon?: number | null,
		height?: number,
		up?: string,
		recenter?: boolean,
		azimuth?: number,
		elevation?: number,
		roll?: number,
	} );

	tiles: TilesRenderer | null;
	lat: number | null;
	lon: number | null;
	height: number;
	up: string;
	recenter: boolean;
	azimuth: number;
	elevation: number;
	roll: number;

	transformLatLonHeightToOrigin( lat: number, lon: number, height?: number, azimuth?: number, elevation?: number, roll?: number ): void;

}

export class DebugTilesPlugin {

	constructor( options?: {
		displayBoxBounds?: boolean,
		displaySphereBounds?: boolean,
		displayRegionBounds?: boolean,
		displayParentBounds?: boolean,
		enabled?: boolean,
	} );

	tiles: TilesRenderer | null;
	displayBoxBounds: boolean;
	displaySphereBounds: boolean;
	displayRegionBounds: boolean;
	displayParentBounds: boolean;
	enabled: boolean;

}

export class TilesFadePlugin extends TilesFadePluginBase {

	constructor( options?: {
		fadeDuration?: number,
		maximumFadeOutTiles?: number,
		fadeRootTiles?: boolean,
	} );

}
