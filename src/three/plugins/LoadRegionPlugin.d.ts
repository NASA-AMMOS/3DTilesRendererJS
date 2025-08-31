import { TileBoundingVolume, TilesRenderer, OBB } from '3d-tiles-renderer/three';
import { Tile } from '3d-tiles-renderer/core';
import { Sphere, Ray } from 'three';

declare class BaseRegion {

	errorTarget: number;
	mask: boolean;
	constructor( options?: { errorTarget?: number, mask?: boolean } );
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
	constructor( options?: { errorTarget?: number, mask?: boolean, obb?: OBB } );

}

export class RayRegion extends BaseRegion {

	ray: Ray;
	constructor( options?: { errorTarget?: number, mask?: boolean, ray?: Ray } );

}

export class SphereRegion extends BaseRegion {

	sphere: Sphere;
	constructor( options?: { errorTarget?: number, mask?: boolean, sphere?: Sphere } );

}
