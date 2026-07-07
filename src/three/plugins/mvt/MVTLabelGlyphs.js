import { MVTGlyphs } from './MVTGlyphs.js';

/**
 * Renders text labels one glyph per character, laid out along each annotation's path. Characters are
 * rasterized into the atlas on demand, so a label's text may change at any time.
 * @extends MVTGlyphs
 */
export class MVTLabelGlyphs extends MVTGlyphs {

	/**
	 * @param {Object} [options]
	 * @param {number} [options.size=16] - Glyph size in pixels.
	 * @param {number} [options.glyphSize] - Atlas slot size in pixels (defaults to `16 * devicePixelRatio`).
	 * @param {number} [options.slotCount=64] - Initial atlas slot capacity ( grows as needed ).
	 * @param {string|null} [options.font=null] - Explicit CSS font string; overrides `fontFamily`.
	 * @param {string} [options.fontFamily='sans-serif'] - Font family used to build the CSS font when
	 * `font` isn't given.
	 * @param {string} [options.strokeStyle='black'] - Outline color drawn under each glyph.
	 * @param {number} [options.strokeWidth=0] - Outline width in atlas pixels ( 0 disables the outline ).
	 */
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

		super();

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
		this.size = size;

	}

	/**
	 * Advance width of `char` in the label's size units, cached per character.
	 * @param {string} char - The character to measure.
	 * @returns {number} The advance width.
	 */
	measureChar( char ) {

		const { _advanceCache, glyphAtlas, _font } = this;
		if ( ! _advanceCache.has( char ) ) {

			const multiplier = this.size / glyphAtlas.slotSize;
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
