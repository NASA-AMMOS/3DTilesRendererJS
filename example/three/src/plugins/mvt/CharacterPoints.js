import { BufferAttribute, BufferGeometry, Matrix4, Points } from 'three';
import { GlyphAtlasTexture } from '3d-tiles-renderer/plugins';
import { GlyphMaterial } from './GlyphMaterial.js';

const _mvMatrix = /* @__PURE__ */ new Matrix4();

// Draws one glyph per character for the currently-visible text anchors. Each anchor's
// `characterPositions` (and the characters in its `text`) are recomputed every frame by its
// evaluate(), so the geometry is rebuilt on every update. Glyphs are rasterized lazily into a
// shared atlas the first time a character is seen. ( Orientation / kerning come later. )
export class CharacterPoints extends Points {

	constructor( options = {} ) {

		const {
			size = 16,
			glyphSize = 16 * window.devicePixelRatio,
			slotCount = 256,
			font = null,
			strokeStyle = 'black',
			strokeWidth = null,
		} = options;

		super( new BufferGeometry(), new GlyphMaterial( { size } ) );

		this.renderOrder = 1001;
		this.frustumCulled = false;

		this.fadeInDuration = 0.3;
		this.fadeOutDuration = 0.3;

		// Map<itemId, entry> keyed by stable id; entry: { item, fade: 0..1, state: 'in'|'visible'|'out' }
		this._entryMap = new Map();
		this._orderedEntries = [];
		this._lastUpdateTime = - 1;

		// CSS font used to rasterize glyphs, sized to fit the atlas slot
		const fontSize = Math.round( glyphSize * 0.7 );
		this._font = font ?? `400 ${ fontSize }px Arial`;

		// canvas context for measuring advance widths, normalized to em units ( width / fontSize )
		this._measureSize = fontSize;
		this._advanceCache = new Map();

		// black halo so glyphs read over the imagery
		this._strokeStyle = strokeStyle;
		this._strokeWidth = strokeWidth ?? Math.max( 1, Math.round( glyphSize * 0.08 ) );

		this.glyphAtlas = new GlyphAtlasTexture( slotCount, glyphSize );
		this.material.glyphTexture = this.glyphAtlas;
		this.glyphAtlas.getSlotSize( this.material.glyphCellSize );

	}

	update( added, removed ) {

		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		// add new anchors, refresh LoD-swapped references, reverse in-progress fade-outs
		const { _entryMap, _orderedEntries, fadeInDuration, fadeOutDuration } = this;
		for ( const item of added ) {

			const existing = _entryMap.get( item.id );
			if ( ! existing ) {

				const entry = { item, fade: 0, state: 'in' };
				_entryMap.set( item.id, entry );
				_orderedEntries.push( entry );

			} else {

				// keep reference fresh (LoD swap)
				existing.item = item;
				if ( existing.state === 'out' ) existing.state = 'in';

			}

		}

		// start fade-out for removed anchors
		for ( const item of removed ) {

			const entry = _entryMap.get( item.id );
			if ( entry && entry.state !== 'out' ) {

				entry.state = 'out';

			}

		}

		// tick fades; collect fully-faded-out anchors for removal
		const toRemove = [];
		for ( const [ id, entry ] of _entryMap ) {

			if ( entry.state === 'in' ) {

				entry.fade = Math.min( 1, entry.fade + dt / fadeInDuration );
				if ( entry.fade >= 1 ) {

					entry.state = 'visible';

				}

			} else if ( entry.state === 'out' ) {

				entry.fade = Math.max( 0, entry.fade - dt / fadeOutDuration );
				if ( entry.fade <= 0 ) {

					toRemove.push( id );

				}

			}

		}

		if ( toRemove.length > 0 ) {

			for ( const id of toRemove ) {

				_entryMap.delete( id );

			}

			this._orderedEntries = _orderedEntries.filter( e => _entryMap.has( e.item.id ) );

		}

		this._updateGeometry();

	}

	onAfterRender( renderer, scene, camera ) {

		// keep the root near the camera to avoid gpu jitter at globe scale
		const { parent } = this;
		if ( parent ) {

			_mvMatrix.copy( parent.matrixWorld ).invert();

		} else {

			_mvMatrix.identity();

		}

		this.position.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _mvMatrix );
		this.updateMatrixWorld( true );

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

	// uv bounds of the glyph for `char`, rasterizing it into the atlas on first use
	_glyphUV( char ) {

		// TODO: we need to use a smart counter to determine when
		// to free a slot
		const { glyphAtlas } = this;
		if ( ! glyphAtlas.has( char ) ) {

			glyphAtlas.drawChar( char, char, {
				font: this._font,
				color: 'white',
				strokeStyle: this._strokeStyle,
				strokeWidth: this._strokeWidth,
			} );

		}

		return glyphAtlas.getUV( char );

	}

	_updateGeometry() {

		const { _orderedEntries, geometry, position } = this;

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

				const uv = this._glyphUV( text[ c ] );
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
