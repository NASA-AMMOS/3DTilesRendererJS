import { PointsMaterial, PointsMaterialParameters, Vector2 } from 'three';
import { MVTGlyphAtlasTexture } from './MVTGlyphAtlasTexture.js';

export class MVTGlyphMaterial extends PointsMaterial {

	glyphAtlas: MVTGlyphAtlasTexture;
	readonly glyphCellSize: Vector2;

	constructor( parameters?: PointsMaterialParameters );

}
