import { Group } from 'three';
import { TilesRenderer } from './TilesRenderer';

export class TilesGroup extends Group {

	tilesRenderer : TilesRenderer;
	constructor( tilesRenderer : TilesRenderer );

}
