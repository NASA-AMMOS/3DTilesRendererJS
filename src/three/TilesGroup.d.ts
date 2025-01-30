import { Group } from 'three';
import { TilesRenderer } from './TilesRenderer';

export class TilesGroup extends Group {

	readonly isTilesGroup: true;
	tilesRenderer : TilesRenderer;
	constructor( tilesRenderer : TilesRenderer );

}
