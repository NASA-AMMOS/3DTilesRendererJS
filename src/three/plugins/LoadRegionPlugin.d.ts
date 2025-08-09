import { TileBoundingVolume } from '../../three/renderer/math/TileBoundingVolume.js';
import { Tile } from '../../core/renderer/tiles/Tile.js';
import { TilesRenderer } from '../../three/renderer/tiles/TilesRenderer.js';
import { OBB } from '../../three/renderer/math/OBB.js';
import { Sphere, Ray } from 'three';

declare class BaseRegion {

	constructor( errorTarget?: number, mask?: boolean );
	errorTarget: number;
	mask: boolean;
	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, tilesRenderer: TilesRenderer ): boolean
	calculateError( tile: Tile, tilesRenderer: TilesRenderer ): number

}

export class LoadRegionPlugin {

	addRegion( region: BaseRegion ): void;
	removeRegion( region: BaseRegion ): void;
	hasRegion( region: BaseRegion ): void;
	clearRegions(): void;

}

export class OBBRegion extends BaseRegion {

	obb: OBB;
	constructor( errorTarget?: number, mask?: boolean, obb?: OBB );

}

export class RayRegion extends BaseRegion {

	ray: Ray;
	constructor( errorTarget?: number, mask?: boolean, ray?: Ray );

}

export class SphereRegion extends BaseRegion {

	sphere: Sphere;
	constructor( errorTarget?: number, mask?: boolean, sphere?: Sphere );

}
