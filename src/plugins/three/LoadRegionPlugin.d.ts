import { TileBoundingVolume } from '../../three/math/TileBoundingVolume.js';
import { Tile } from '../../base/Tile.js';
import { TilesRenderer } from '../../three/TilesRenderer.js';
import { OBB } from '../../three/math/OBB.js';
import { Sphere, Ray } from 'three';

declare class BaseRegion {

	constructor( errorTarget?: number );
	errorTarget: number;
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
	constructor( errorTarget?: number, obb?: OBB );

}

export class RayRegion extends BaseRegion {

	ray: Ray;
	constructor( errorTarget?: number, ray?: Ray );

}

export class SphereRegion extends BaseRegion {

	sphere: Sphere;
	constructor( errorTarget?: number, sphere?: Sphere );

}
