import { CanvasTexture } from 'three';

export interface GlyphSlot {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface DrawPathOptions {
	fillStyle?: string | null;
	strokeStyle?: string | null;
	lineWidth?: number;
}

export class GlyphAtlasTexture extends CanvasTexture {

	readonly slotSize: number;
	readonly isFull: boolean;

	constructor( slotCount: number, slotSize: number );

	has( key: string ): boolean;
	get( key: string ): GlyphSlot | null;

	drawGlyph( key: string, char: string, font: string, color?: string ): GlyphSlot;
	drawImage( key: string, image: CanvasImageSource ): GlyphSlot;
	drawPath( key: string, path2D: Path2D, options?: DrawPathOptions ): GlyphSlot;

	release( key: string ): void;
	resize( slotCount: number, slotSize?: number ): void;
	clear(): void;

}
