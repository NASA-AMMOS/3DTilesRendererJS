import { Matrix4, Sphere } from 'three';
import { TileBoundingVolume } from '../../../three/math/TileBoundingVolume.js';
import { Tile } from '../../../base/Tile.js';

export class SphereRegion {

	sphere: Sphere;
	errorTarget: number;

	constructor( ray?: Ray, errorTarget?: number )

	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, matrixWorldInverse: Matrix4 ): boolean
	calculateError( tile: Tile, errorTarget: number ): number

}
