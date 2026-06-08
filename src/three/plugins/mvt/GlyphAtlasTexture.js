import { CanvasTexture, SRGBColorSpace, Vector2 } from 'three';

/**
 * A canvas texture that manages a grid of fixed-size slots, each holding a rendered glyph or icon.
 * Slots are addressed by string key and can be drawn with text, images, or paths.
 * @extends CanvasTexture
 */
export class GlyphAtlasTexture extends CanvasTexture {

	/**
	 * Returns true when all slots are allocated.
	 * @returns {boolean}  */
	get isFull() {

		return this._freeList.length === 0 && this._nextIndex >= this._capacity;

	}

	/**
	 * @param {number} slotCount - Maximum number of slots in the atlas.
	 * @param {number} slotSize - Width and height of each slot in pixels.
	 */
	constructor( slotCount, slotSize ) {

		super( null );

		this.slotSize = 0;

		// key -> slot index
		this._slots = new Map();
		this._freeList = [];
		this._nextIndex = 0;
		this._capacity = 0;
		this._columns = 0;

		this.resize( slotCount, slotSize );
		this.colorSpace = SRGBColorSpace;

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
	 * Returns the UV bounds of a slot for key in GPU texture space (flipY applied),
	 * or null if not allocated.
	 * @param {Vector2} target
	 * @returns {Vector2}
	 */
	getSlotSize( target ) {

		const { slotSize, image } = this;
		return target.set( slotSize / image.width, slotSize / image.height );

	}

	/**
	 * Returns the UV bounds of the slot for key in GPU texture space (flipY applied),
	 * or null if not allocated. x/y is the top-left corner; w/h is the slot size in UV units.
	 * @param {string} key
	 * @returns {{ x: number, y: number, w: number, h: number } | null}
	 */
	getUV( key ) {

		const slot = this.get( key );
		if ( slot === null ) return null;

		const { width, height } = this.image;
		return {
			x: slot.x / width,
			y: ( height - slot.y ) / height,
			w: this.slotSize / width,
			h: this.slotSize / height,
		};

	}

	/**
	 * Renders a single character centered in the slot.
	 * @param {string} key
	 * @param {string} char - The character to draw.
	 * @param {Object} [styles={}]
	 * @param {string} [styles.font=''] CSS font string (e.g. `'bold 48px sans-serif'`).
	 * @param {string} [styles.color='white'] CSS fill color.
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawChar( key, char, styles = {} ) {

		const {
			font = '',
			color = 'white',
		} = styles;

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
	 * @param {Object} [styles={}]
	 * @param {string|null} [styles.fillStyle=null] CSS fill color, or null to skip fill.
	 * @param {string|null} [styles.strokeStyle=null] CSS stroke color, or null to skip stroke.
	 * @param {number} [styles.lineWidth=1] Stroke width in pixels.
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawPath( key, path2D, styles = {} ) {

		const {
			fillStyle = null,
			strokeStyle = null,
			lineWidth = 1,
		} = styles;

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
	 * @param {Object} [styles={}]
	 * @param {string|null} [styles.fillStyle='white'] CSS fill color, or null to skip fill.
	 * @param {string|null} [styles.strokeStyle=null] CSS stroke color, or null to skip stroke.
	 * @param {number} [styles.strokeWidth=1] Stroke width in SVG user units before scaling.
	 * @param {number} [styles.iconScale=1] Fraction of the slot size the icon occupies (0–1).
	 * @returns {{ x: number, y: number, w: number, h: number }} The allocated slot.
	 * @throws If the atlas is full.
	 */
	drawSVG( key, svgText, styles = {} ) {

		const {
			fillStyle = 'white',
			strokeStyle = null,
			strokeWidth = 1,
			iconScale = 1,
		} = styles;

		// parse the svg doc so we can extract the content
		const doc = new DOMParser().parseFromString( svgText, 'image/svg+xml' );
		const svg = doc.documentElement;

		const vbParts = ( svg.getAttribute( 'viewBox' ) ?? '0 0 15 15' ).trim().split( /[\s,]+/ );
		const vbW = parseFloat( vbParts[ 2 ] );
		const vbH = parseFloat( vbParts[ 3 ] );

		// parse all paths
		const paths = [ ...svg.querySelectorAll( 'path' ) ]
			.map( el => el.getAttribute( 'd' ) )
			.filter( Boolean )
			.map( d => new Path2D( d ) );

		return this._draw( key, ( ctx, x, y, w, h ) => {

			// TODO: this draw is resulting in alpha blending white outline
			// We might be able to use "source-over" and "destination-in" with "globalCompositeOperation"
			// to fix this.

			const iw = w * iconScale;
			const ih = h * iconScale;
			const scale = Math.min( iw / vbW, ih / vbH );
			const originX = x + ( w - vbW * scale ) / 2;
			const originY = y + ( h - vbH * scale ) / 2;

			ctx.save();
			ctx.translate( originX, originY );
			ctx.scale( scale, scale );
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';

			if ( strokeStyle !== null ) {

				ctx.lineWidth = strokeWidth / scale;
				ctx.strokeStyle = strokeStyle;
				for ( const path of paths ) {

					ctx.stroke( path );

				}

			}

			if ( fillStyle !== null ) {

				ctx.fillStyle = fillStyle;
				for ( const path of paths ) {

					ctx.fill( path );

				}

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
		for ( const i of this._slots.values() ) {

			const srcX = ( i % oldColumns ) * oldSlotSize;
			const srcY = Math.floor( i / oldColumns ) * oldSlotSize;
			const dstX = ( i % columns ) * slotSize;
			const dstY = Math.floor( i / columns ) * slotSize;
			ctx.drawImage(
				oldCanvas,
				srcX, srcY, oldSlotSize, oldSlotSize,
				dstX, dstY, slotSize, slotSize,
			);

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

	// calls the callback to draw into the calculated slot for the given key
	_draw( key, callback ) {

		const {
			ctx,
			_freeList,
			_capacity,
			_slots,
		} = this;

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

		// prepare the drawing clip
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

	// calculates the section of the canvas for the given index
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
