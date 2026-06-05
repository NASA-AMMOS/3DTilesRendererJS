import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * A GPU texture that manages a grid of fixed-size slots, each holding a rendered glyph or icon.
 * Slots are addressed by string key and can be drawn with text, images, or paths.
 * Extends Three.js `CanvasTexture` so it can be passed directly to a material uniform.
 */
export class GlyphAtlasTexture extends CanvasTexture {

	/**
	 * @param {number} slotCount - Maximum number of slots in the atlas.
	 * @param {number} slotSize - Width and height of each slot in pixels.
	 */
	constructor( slotCount, slotSize ) {

		super( null );

		this.slotSize = 0;

		// key → slot index
		this._slots = new Map();
		this._freeList = [];
		this._nextIndex = 0;
		this._capacity = 0;
		this._columns = 0;

		this.resize( slotCount, slotSize );
		this.colorSpace = SRGBColorSpace;

	}

	/** @returns {boolean} True when all slots are allocated. */
	get isFull() {

		return this._freeList.length === 0 && this._nextIndex >= this._capacity;

	}

	/**
	 * Returns true if key has an allocated slot.
	 * @param {string} key
	 * @returns {boolean}
	 */
	has( key ) {

		return this._slots.has( key );

	}

	/**
	 * Returns the slot bounds `{ x, y, w, h }` for key, or null if not allocated.
	 * @param {string} key
	 * @returns {{ x: number, y: number, w: number, h: number } | null}
	 */
	get( key ) {

		const { _slots } = this;
		if ( ! _slots.has( key ) ) {

			return null;

		}

		return this._indexToSlot( _slots.get( key ) );

	}

	/**
	 * Renders a single character centered in the slot.
	 * @param {string} key
	 * @param {string} char - The character to draw.
	 * @param {string} font - CSS font string (e.g. `'bold 48px sans-serif'`).
	 * @param {string} [color='white'] - CSS fill color.
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawChar( key, char, { font = '', color = 'white' } = {} ) {

		return this._draw( key, ( ctx, x, y, w, h ) => {

			ctx.font = font;
			ctx.fillStyle = color;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText( char, x + w / 2, y + h / 2 );

		} );

	}

	/**
	 * Draws a `CanvasImageSource` into the slot, scaled to fit.
	 * @param {string} key
	 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} image
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawImage( key, image ) {

		return this._draw( key, ( ctx, x, y, w, h ) => {

			ctx.drawImage( image, x, y, w, h );

		} );

	}

	/**
	 * Renders a `Path2D` into the slot. Path coordinates are slot-local (origin at top-left).
	 * @param {string} key
	 * @param {Path2D} path2D
	 * @param {{ fillStyle?: string|null, strokeStyle?: string|null, lineWidth?: number }} [options]
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawPath( key, path2D, { fillStyle = null, strokeStyle = null, lineWidth = 1 } = {} ) {

		return this._draw( key, ( ctx, x, y ) => {

			ctx.save();
			ctx.translate( x, y );

			if ( fillStyle !== null ) {

				ctx.fillStyle = fillStyle;
				ctx.fill( path2D );

			}

			if ( strokeStyle !== null ) {

				ctx.strokeStyle = strokeStyle;
				ctx.lineWidth = lineWidth;
				ctx.stroke( path2D );

			}

			ctx.restore();

		} );

	}

	/**
	 * Parses an SVG string and renders its paths into a slot, scaled to fit.
	 * @param {string} key
	 * @param {string} svgText
	 * @param {{ fillStyle?: string|null, strokeStyle?: string|null, strokeWidth?: number, iconScale?: number }} [options]
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawSVG( key, svgText, { fillStyle = 'white', strokeStyle = null, strokeWidth = 1, iconScale = 1 } = {} ) {

		const doc = new DOMParser().parseFromString( svgText, 'image/svg+xml' );
		const svg = doc.documentElement;
		const vbParts = ( svg.getAttribute( 'viewBox' ) ?? '0 0 15 15' ).trim().split( /[\s,]+/ );
		const vbW = parseFloat( vbParts[ 2 ] );
		const vbH = parseFloat( vbParts[ 3 ] );
		const paths = [ ...svg.querySelectorAll( 'path' ) ]
			.map( el => el.getAttribute( 'd' ) )
			.filter( Boolean )
			.map( d => new Path2D( d ) );

		return this._draw( key, ( ctx, x, y, w, h ) => {

			const iw = w * iconScale;
			const ih = h * iconScale;
			const scale = Math.min( iw / vbW, ih / vbH );
			const ox = x + ( w - vbW * scale ) / 2;
			const oy = y + ( h - vbH * scale ) / 2;

			ctx.save();
			ctx.translate( ox, oy );
			ctx.scale( scale, scale );
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';

			if ( strokeStyle !== null ) {

				ctx.lineWidth = strokeWidth / scale;
				ctx.strokeStyle = strokeStyle;
				for ( const path of paths ) ctx.stroke( path );

			}

			if ( fillStyle !== null ) {

				ctx.fillStyle = fillStyle;
				for ( const path of paths ) ctx.fill( path );

			}

			ctx.restore();

		} );

	}

	/**
	 * Frees the slot for key, returning it to the pool for reuse.
	 * @param {string} key
	 */
	release( key ) {

		const { _slots, _freeList } = this;
		if ( ! _slots.has( key ) ) {

			return;

		}

		const index = _slots.get( key );
		_freeList.push( index );
		_slots.delete( key );

	}

	/**
	 * Resizes the atlas, copying existing slot content to their new positions.
	 * @param {number} slotCount - New maximum slot count.
	 * @param {number} [slotSize] - New slot size in pixels. Defaults to current size.
	 */
	resize( slotCount, slotSize = this.slotSize ) {

		const oldCanvas = this.image;
		const oldColumns = this._columns;
		const oldSlotSize = this.slotSize;

		const columns = Math.ceil( Math.sqrt( slotCount ) );
		const canvas = document.createElement( 'canvas' );
		canvas.width = columns * slotSize;
		canvas.height = columns * slotSize;

		const ctx = canvas.getContext( '2d' );

		// copy each allocated slot from its old grid position to its new one
		for ( const index of this._slots.values() ) {

			const srcX = ( index % oldColumns ) * oldSlotSize;
			const srcY = Math.floor( index / oldColumns ) * oldSlotSize;
			const dstX = ( index % columns ) * slotSize;
			const dstY = Math.floor( index / columns ) * slotSize;
			ctx.drawImage( oldCanvas, srcX, srcY, oldSlotSize, oldSlotSize, dstX, dstY, slotSize, slotSize );

		}

		this.image = canvas;
		this.ctx = ctx;
		this.slotSize = slotSize;
		this._columns = columns;
		this._capacity = slotCount;
		this.needsUpdate = true;

	}

	/**
	 * Clears all slots and resets the atlas to empty.
	 */
	clear() {

		this._slots.clear();
		this._freeList.length = 0;
		this._nextIndex = 0;
		this.ctx.clearRect( 0, 0, this.image.width, this.image.height );
		this.needsUpdate = true;

	}

	_draw( key, callback ) {

		const { _freeList, _capacity, _slots, ctx } = this;

		let index;
		if ( _slots.has( key ) ) {

			index = _slots.get( key );

		} else {

			if ( _freeList.length > 0 ) {

				index = _freeList.pop();

			} else if ( this._nextIndex < _capacity ) {

				index = this._nextIndex ++;

			} else {

				throw new Error( 'GlyphAtlasTexture: atlas is full. Call resize() to increase capacity.' );

			}

			_slots.set( key, index );

		}

		const slot = this._indexToSlot( index );
		ctx.save();
		ctx.beginPath();
		ctx.rect( slot.x, slot.y, slot.w, slot.h );
		ctx.clip();
		callback( ctx, slot.x, slot.y, slot.w, slot.h );
		ctx.restore();

		this.needsUpdate = true;
		return slot;

	}

	_indexToSlot( index ) {

		const { _columns, slotSize } = this;
		return {
			x: ( index % _columns ) * slotSize,
			y: Math.floor( index / _columns ) * slotSize,
			w: slotSize,
			h: slotSize,
		};

	}

}
