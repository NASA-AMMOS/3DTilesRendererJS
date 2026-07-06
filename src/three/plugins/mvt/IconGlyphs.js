import { GlyphMaterial } from './GlyphMaterial.js';
import { Glyphs } from './Glyphs.js';

export class IconGlyphs extends Glyphs {

	constructor( options = {} ) {

		const {
			getKind = () => null,
			size = 18,
			glyphSize = 18 * window.devicePixelRatio,
			slotCount = 64,
		} = options;

		super( new GlyphMaterial() );

		this.getKind = getKind;
		this.size = size;

		this.glyphAtlas.resize( slotCount, glyphSize );

	}

	_updateGeometry() {

		const { _orderedEntries, getKind } = this;
		const count = _orderedEntries.length;
		this._resizeGeometry( count );

		for ( let i = 0; i < count; i ++ ) {

			const { item, fade } = _orderedEntries[ i ];
			this._writeGlyph( i, item.position, getKind( item.layer, item.properties ), fade );

		}

		this._markNeedsUpdate();

	}

}
