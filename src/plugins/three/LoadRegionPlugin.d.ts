import { TileBoundingVolume } from '../../../three/math/TileBoundingVolume.js';
import { Tile } from '../../../base/Tile.js';
import { TilesRenderer } from '../../../three/TilesRenderer.js';

export interface Region {

	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, tilesRenderer: TilesRenderer ): boolean
	calculateError( tile: Tile, tilesRenderer: TilesRenderer ): number

}

export class ReorientationPlugin {

	addRegion( region: Region ): void;
	removeRegion( region ): void;
	hasRegion( region ): void;
	clearRegions(): void;

}
