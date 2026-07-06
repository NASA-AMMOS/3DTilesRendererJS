import { MVTGlyphMaterial } from './MVTGlyphMaterial.js';
import { MVTGlyphs } from './MVTGlyphs.js';

export class MVTLabelGlyphs extends MVTGlyphs {

	constructor( options = {} ) {

		const {
			size = 16,
			glyphSize = 16 * window.devicePixelRatio,
			slotCount = 64,
			font = null,
			fontFamily = 'sans-serif',
			strokeStyle = 'black',
			strokeWidth = 0,
		} = options;

		super( new MVTGlyphMaterial( { size } ) );

		// CSS font used to rasterize glyphs, sized to fit the atlas slot
		const fontSize = Math.round( glyphSize * 0.7 );
		this._font = font ?? `400 ${ fontSize }px ${ fontFamily }`;

		// advance-width cache, keyed per character
		this._advanceCache = new Map();

		// styling
		this._strokeStyle = strokeStyle;
		this._strokeWidth = strokeWidth;

		// characters currently rasterized in the atlas, plus a reused scratch set of the characters
		// needed this frame. the atlas is reconciled against what's actually rendered ( not against
		// add / remove events ), so it stays correct even when an annotation's text changes.
		this._drawn = new Set();
		this._needed = new Set();

		this.glyphAtlas.resize( slotCount, glyphSize );

	}

	// advance width of `char` in em units ( fraction of the font size ), cached per character
	measureChar( char ) {

		const { _advanceCache, material, glyphAtlas, _font } = this;
		if ( ! _advanceCache.has( char ) ) {

			const multiplier = material.size / glyphAtlas.slotSize;
			const info = glyphAtlas.measureChar( char, _font );
			const advance = info.width + 2;

			_advanceCache.set( char, advance * multiplier );

		}

		return _advanceCache.get( char );

	}

	// rasterize a character into the atlas, evicting a glyph that isn't needed this frame ( or
	// growing the atlas if every rasterized glyph is still in use )
	_drawChar( char, needed ) {

		const { glyphAtlas, _drawn } = this;
		if ( glyphAtlas.capacity === glyphAtlas.count ) {

			let toRemove = null;
			for ( const c of _drawn ) {

				if ( ! needed.has( c ) ) {

					toRemove = c;
					break;

				}

			}

			if ( toRemove !== null ) {

				glyphAtlas.release( toRemove );
				_drawn.delete( toRemove );

			} else {

				glyphAtlas.resize( glyphAtlas.capacity * 2 );

			}

		}

		glyphAtlas.drawChar( char, char, {
			font: this._font,
			color: 'white',
			strokeStyle: this._strokeStyle,
			strokeWidth: this._strokeWidth,
		} );
		_drawn.add( char );

	}

	_updateGeometry() {

		const { _orderedEntries, _needed, glyphAtlas } = this;

		// collect the characters needed this frame from each items text, and the total glyph
		// count
		_needed.clear();
		let count = 0;
		for ( const entry of _orderedEntries ) {

			const { text, characterPositions } = entry.item;
			count += characterPositions.length;
			for ( let c = 0, l = text.length; c < l; c ++ ) {

				_needed.add( text[ c ] );

			}

		}

		// make sure every needed character is rasterized before we look up its uv
		for ( const char of _needed ) {

			if ( ! glyphAtlas.has( char ) ) {

				this._drawChar( char, _needed );

			}

		}

		this._resizeGeometry( count );

		let i = 0;
		for ( const entry of _orderedEntries ) {

			const anchor = entry.item;
			const { fade } = entry;
			const positions = anchor.characterPositions;
			const angles = anchor.characterAngles;
			const text = anchor.text;
			for ( let c = 0, l = positions.length; c < l; c ++ ) {

				this._writeGlyph( i ++, positions[ c ], text[ c ], fade, angles[ c ] );

			}

		}

		this._markNeedsUpdate();

	}

}
