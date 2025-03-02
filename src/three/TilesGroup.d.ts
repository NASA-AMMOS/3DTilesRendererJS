import { Group, Matrix4 } from 'three';
import { TilesRenderer } from './TilesRenderer';

export class TilesGroup extends Group {

	readonly isTilesGroup: true;
	tilesRenderer: TilesRenderer;
	matrixWorldInverse: Matrix4;
	constructor( tilesRenderer : TilesRenderer );

}
