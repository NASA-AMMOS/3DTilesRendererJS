import { GlyphAtlasTexture } from './GlyphAtlasTexture.js';
import { CATEGORY_COLORS } from './annotationColors.js';

const CATEGORY_EMOJI = {
	tangerine: '🍴',
	green: '🌳',
	lapis: '✈️',
	slategray: '🎓',
	blue: '🛒',
	pink: '🎭',
	red: '🏥',
	turquoise: '🏨',
};

const GLYPH_SIZE = 64;
// 16 slots gives a 4×4 grid (256×256 canvas) — room to add more categories later
const GLYPH_SLOT_COUNT = 16;

export class AnnotationGlyphAtlasTexture extends GlyphAtlasTexture {

	constructor() {

		super( GLYPH_SLOT_COUNT, GLYPH_SIZE );

		const font = `${ Math.round( GLYPH_SIZE * 0.65 ) }px serif`;
		for ( const [ category, emoji ] of Object.entries( CATEGORY_EMOJI ) ) {

			this._draw( category, ( ctx, x, y, w, h ) => {

				const cx = x + w / 2;
				const cy = y + h / 2;
				ctx.font = font;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				// strokeText has no effect on color emoji — use stacked drop-shadow
				// filters (which follow actual pixel shape) to build a solid white outline
				const r = 3;
				ctx.filter = `drop-shadow( ${ r }px 0px 1px white) drop-shadow(-${ r }px 0px 1px white) drop-shadow(0px ${ r }px 1px white) drop-shadow(0px -${ r }px 1px white)`;
				ctx.fillText( emoji, cx, cy );
				ctx.filter = 'none';
				ctx.fillText( emoji, cx, cy );

			} );

		}

	}

	// Returns { uvX, uvY } — top-left corner of the slot in GPU texture space,
	// with flipY applied (canvas top → V=1).  Returns null for unknown categories.
	getCategoryUV( category ) {

		const slot = this.get( category );
		if ( slot === null ) return null;

		const { width, height } = this.image;
		return {
			uvX: slot.x / width,
			uvY: ( height - slot.y ) / height,
		};

	}

	// UV size of one slot. Y is negative so gl_PointCoord.y (0=top → 1=bottom)
	// scans downward in texture space (decreasing V).
	get glyphCellUVSize() {

		const { width, height } = this.image;
		return { u: this.slotSize / width, v: - this.slotSize / height };

	}

}

export { CATEGORY_EMOJI };
