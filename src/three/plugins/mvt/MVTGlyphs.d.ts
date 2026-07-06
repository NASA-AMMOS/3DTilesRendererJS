import { Points, Raycaster, Vector2 } from 'three';
import { MVTGlyphMaterial } from './MVTGlyphMaterial.js';
import { MVTGlyphAtlasTexture } from './MVTGlyphAtlasTexture.js';

export class MVTGlyphs extends Points {

	size: number;
	readonly glyphAtlas: MVTGlyphAtlasTexture;
	resolution: Vector2;
	fadeInDuration: number;
	fadeOutDuration: number;

	constructor( material: MVTGlyphMaterial );

	dispose(): void;
	update( added: Iterable<object>, removed: Iterable<object> ): void;
	raycast( raycaster: Raycaster, intersects: object[] ): void;

}
