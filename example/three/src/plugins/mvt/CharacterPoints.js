import { BufferAttribute } from 'three';
import { GlyphMaterial } from './GlyphMaterial.js';
import { GlyphPoints } from './GlyphPoints.js';

const _uvTarget = {};

export class CharacterPoints extends GlyphPoints {

	constructor( options = {} ) {

		const {
			size = 16,
			glyphSize = 16 * window.devicePixelRatio,
			slotCount = 64,
			font = null,
			strokeStyle = 'black',
			strokeWidth = 0,
		} = options;

		super( new GlyphMaterial( { size } ) );

		// CSS font used to rasterize glyphs, sized to fit the atlas slot
		const fontSize = Math.round( glyphSize * 0.7 );
		this._font = font ?? `400 ${ fontSize }px Arial`;

		// canvas context for measuring advance widths, normalized to em units ( width / fontSize )
		this._advanceCache = new Map();

		// styling
		this._strokeStyle = strokeStyle;
		this._strokeWidth = strokeWidth;

		// the refs and unused list of the character glyphs
		this._refs = {};
		this._unused = [];

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

	update( added, removed ) {

		super.update( added, removed );
		const { _refs, _unused, _removed, glyphAtlas } = this;

		// iterate over all the added annotations and increment the ref, drawing the
		// glyph to the atlas if needed.
		added.forEach( ( { text } ) => {

			for ( let i = 0, l = text.length; i < l; i ++ ) {

				const char = text[ i ];
				if ( ! ( char in _refs ) ) {

					// if we've reached our capacity
					if ( glyphAtlas.capacity === glyphAtlas.count ) {

						if ( _unused.length > 0 ) {

							// if there are unused slots then free up one of those
							const unusedChar = _unused.pop();
							glyphAtlas.release( unusedChar );
							delete _refs[ unusedChar ];

						} else {

							// otherwise resize the atlas to fit more glyphs
							glyphAtlas.resize( glyphAtlas.capacity * 2 );

						}

					}

					// draw the glyph
					_refs[ char ] = 0;
					glyphAtlas.drawChar( char, char, {
						font: this._font,
						color: 'white',
						strokeStyle: this._strokeStyle,
						strokeWidth: this._strokeWidth,
					} );

				}

				_refs[ char ] ++;

			}

		} );

		// decrement the refs and queue up any characters as unused if they reach 0
		_removed.forEach( ( { text } ) => {

			for ( let i = 0, l = text.length; i < l; i ++ ) {

				const char = text[ i ];
				_refs[ char ] --;
				if ( _refs[ char ] === 0 ) {

					_unused.push( char );

				}

			}

		} );

	}

	_updateGeometry() {

		const { _orderedEntries, geometry, position, glyphAtlas } = this;

		// total character count across all entries ( including fading ones )
		let count = 0;
		for ( const entry of _orderedEntries ) {

			count += entry.item.characterPositions.length;

		}

		// expand the geometry buffers if needed
		let posAttr = geometry.getAttribute( 'position' );
		let glyphUVAttr = geometry.getAttribute( 'glyphUV' );
		let alphaAttr = geometry.getAttribute( 'alpha' );
		let angleAttr = geometry.getAttribute( 'angle' );
		if ( ! posAttr || posAttr.count < count ) {

			geometry.dispose();
			posAttr = new BufferAttribute( new Float32Array( count * 3 ), 3 );
			glyphUVAttr = new BufferAttribute( new Float32Array( count * 2 ), 2 );
			alphaAttr = new BufferAttribute( new Float32Array( count ), 1 );
			angleAttr = new BufferAttribute( new Float32Array( count ), 1 );
			geometry.setAttribute( 'position', posAttr );
			geometry.setAttribute( 'glyphUV', glyphUVAttr );
			geometry.setAttribute( 'alpha', alphaAttr );
			geometry.setAttribute( 'angle', angleAttr );

		}

		geometry.setDrawRange( 0, count );

		let i = 0;
		for ( const entry of _orderedEntries ) {

			const anchor = entry.item;
			const { fade } = entry;
			const positions = anchor.characterPositions;
			const angles = anchor.characterAngles;
			const text = anchor.text;
			for ( let c = 0, l = positions.length; c < l; c ++ ) {

				const p = positions[ c ];
				posAttr.setXYZ( i, p.x - position.x, p.y - position.y, p.z - position.z );

				const uv = glyphAtlas.getUV( text[ c ], _uvTarget );
				if ( uv !== null ) {

					glyphUVAttr.setXY( i, uv.x, uv.y );

				} else {

					glyphUVAttr.setXY( i, - 1, - 1 );

				}

				alphaAttr.setX( i, fade );
				angleAttr.setX( i, angles[ c ] );
				i ++;

			}

		}

		posAttr.needsUpdate = true;
		glyphUVAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
		angleAttr.needsUpdate = true;

	}

}
