import { MVTGlyphMaterial } from './MVTGlyphMaterial.js';
import { MVTGlyphs } from './MVTGlyphs.js';

export class MVTIconGlyphs extends MVTGlyphs {

	constructor( options = {} ) {

		const {
			getKind = () => null,
			fallback = null,
			size = 18,
			glyphSize = 18 * window.devicePixelRatio,
			slotCount = 64,
		} = options;

		super( new MVTGlyphMaterial() );

		this.getKind = getKind;
		this.fallback = fallback;
		this.size = size;

		this.glyphAtlas.resize( slotCount, glyphSize );

	}

	_updateGeometry() {

		const { _orderedEntries, getKind, glyphAtlas, fallback } = this;
		const count = _orderedEntries.length;
		this._resizeGeometry( count );

		for ( let i = 0; i < count; i ++ ) {

			const { item, fade } = _orderedEntries[ i ];
			let key = getKind( item.layer, item.properties );
			if ( key === null || ! glyphAtlas.has( key ) ) {

				key = fallback;

			}

			this._writeGlyph( i, item.position, key, fade );

		}

		this._markNeedsUpdate();

	}

}
