import { TileBoundingVolume } from '../../three/math/TileBoundingVolume.js';
import { Tile } from '../../base/Tile.js';
import { TilesRenderer } from '../../three/TilesRenderer.js';
import { OBB } from '../../three/math/OBB.js';
import { Sphere, Ray } from 'three';

declare class Region {

	errorTarget: number;
	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, tilesRenderer: TilesRenderer ): boolean
	calculateError( tile: Tile, tilesRenderer: TilesRenderer ): number

}

export class LoadRegionPlugin {

	addRegion( region: Region ): void;
	removeRegion( region: Region ): void;
	hasRegion( region: Region ): void;
	clearRegions(): void;

}

export class OBBRegion extends Region {

	obb: OBB;
	constructor( errorTarget?: number, obb?: OBB );

}

export class RayRegion extends Region {

	ray: Ray;
	constructor( errorTarget?: number, ray?: Ray );

}

export class SphereRegion extends Region {

	sphere: Sphere;
	constructor( errorTarget?: number, sphere?: Sphere );

}
