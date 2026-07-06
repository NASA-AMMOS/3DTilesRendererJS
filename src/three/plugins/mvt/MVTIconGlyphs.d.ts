import { MVTGlyphs } from './MVTGlyphs.js';

export interface MVTIconGlyphsOptions {

	getKind?: ( layer: string, properties: Record<string, unknown> ) => string | null;
	fallback?: string | null;
	size?: number;
	glyphSize?: number;
	slotCount?: number;

}

export class MVTIconGlyphs extends MVTGlyphs {

	getKind: ( layer: string, properties: Record<string, unknown> ) => string | null;
	fallback: string | null;

	constructor( options?: MVTIconGlyphsOptions );

}
