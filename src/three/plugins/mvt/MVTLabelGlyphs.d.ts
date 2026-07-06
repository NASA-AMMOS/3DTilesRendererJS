import { MVTGlyphs } from './MVTGlyphs.js';

export interface MVTLabelGlyphsOptions {

	size?: number;
	glyphSize?: number;
	slotCount?: number;
	font?: string | null;
	fontFamily?: string;
	strokeStyle?: string;
	strokeWidth?: number;

}

export class MVTLabelGlyphs extends MVTGlyphs {

	constructor( options?: MVTLabelGlyphsOptions );

	measureChar( char: string ): number;

}
