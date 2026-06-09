import { GlyphAtlasTexture, GlyphSlot } from '3d-tiles-renderer/plugins';

export class FontAtlasTexture extends GlyphAtlasTexture {

	font: string;
	color: string;

	constructor( slotCount: number, slotSize: number, font: string, color?: string );

	add( char: string ): GlyphSlot;
	release( char: string ): void;

}
