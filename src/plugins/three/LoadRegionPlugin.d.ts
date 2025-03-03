import { TileBoundingVolume } from '../../../three/math/TileBoundingVolume';
import { Tile } from '../../../base/Tile';
import { TilesRenderer } from '../../../three/TilesRenderer';
import { OBB } from '../../three/math/OBB';
import { Sphere, Ray } from 'three';

interface Region {

	errorTarget: number;
	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, tilesRenderer: TilesRenderer ): boolean
	calculateError( tile: Tile, tilesRenderer: TilesRenderer ): number

}

export class ReorientationPlugin {

	addRegion( region: Region ): void;
	removeRegion( region: Region ): void;
	hasRegion( region: Region ): void;
	clearRegions(): void;

}

export class OBBRegion extends Region {

	obb: OBB;
	constructor( errorTarget?: number, obb?: OBB );

}

export class RayRegion extends Regin {

	ray: Ray;
	constructor( errorTarget?: number, ray?: Ray );

}

export class SphereRegion {

	sphere: Sphere;
	constructor( errorTarget?: number, sphere?: Sphere );

}
