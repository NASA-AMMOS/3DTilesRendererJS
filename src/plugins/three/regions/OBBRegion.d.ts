import { Matrix4 } from 'three';
import { OBB } from '../../../three/math/OBB.js';
import { TileBoundingVolume } from '../../../three/math/TileBoundingVolume.js';
import { Tile } from '../../../base/Tile.js';

export class OBBRegion {

	obb: OBB;
	errorTarget: number;

	constructor( obb?: OBB, errorTarget?: number )

	intersectsTile( boundingVolume: TileBoundingVolume, tile: Tile, matrixWorldInverse: Matrix4 ): boolean
	calculateError( tile: Tile, errorTarget: number ): number

}
