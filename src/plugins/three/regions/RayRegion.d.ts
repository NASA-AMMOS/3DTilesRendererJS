import { Matrix4, Ray } from 'three';
import { TileBoundingVolume } from '../../../three/math/TileBoundingVolume.js';
import { Tile } from '../../../base/Tile.js';

export class OBBRegion {

	ray: Ray;
	errorTarget: number;

	constructor( ray?: Ray, errorTarget?: number )

	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, matrixWorldInverse: Matrix4 ): boolean
	calculateError( tile: Tile, errorTarget: number ): number

}
