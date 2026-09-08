import { Group, Raycaster } from 'three';
import { MVTGlyphMaterial } from './MVTGlyphMaterial.js';
import { MVTGlyphAtlasTexture } from './MVTGlyphAtlasTexture.js';

export class MVTGlyphs extends Group {

	static readonly DrawMode: {
		OBSCURED: string;
		DRAW_THROUGH: string;
		OVERLAY: string;
	};

	size: number;
	readonly glyphAtlas: MVTGlyphAtlasTexture;
	fadeInDuration: number;
	fadeOutDuration: number;
	obscuredOpacity: number;
	drawMode: string;

	constructor( material: MVTGlyphMaterial );

	dispose(): void;
	update( added: Iterable<object>, removed: Iterable<object> ): void;
	raycast( raycaster: Raycaster, intersects: object[] ): void;

}
