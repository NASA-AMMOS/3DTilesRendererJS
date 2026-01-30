import { Texture } from 'three';
import { VectorTileStyler } from './VectorTileStyler.js';

export class VectorTileCanvasRenderer {

	styler: VectorTileStyler;
	tileDimension: number;

	constructor( styler: VectorTileStyler, options?: {
		tileDimension?: number,
	} );

	render( vectorTile: any ): Texture;
	createEmptyTexture(): Texture;

}
