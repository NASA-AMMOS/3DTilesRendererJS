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

export interface DrawSVGOptions {
	fillStyle?: string | null;
	strokeStyle?: string | null;
	strokeWidth?: number;
	iconScale?: number;
}

export class GlyphAtlasTexture extends CanvasTexture {

	readonly slotSize: number;
	readonly isFull: boolean;

	constructor( slotCount: number, slotSize: number );

	has( key: string ): boolean;
	get( key: string ): GlyphSlot | null;
	getSlotSize( target: { set( x: number, y: number ): unknown } ): typeof target;
	getUV( key: string ): { x: number; y: number; w: number; h: number } | null;

	drawChar( key: string, char: string, options?: { font?: string; color?: string } ): GlyphSlot;
	drawImage( key: string, image: HTMLImageElement | HTMLCanvasElement | ImageBitmap ): GlyphSlot;
	drawPath( key: string, path2D: Path2D, options?: DrawPathOptions ): GlyphSlot;
	drawSVG( key: string, svgText: string, options?: DrawSVGOptions ): GlyphSlot;

	release( key: string ): void;
	resize( slotCount: number, slotSize?: number ): void;
	clear(): void;

}
