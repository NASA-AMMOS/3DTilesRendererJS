// Shelf-packer glyph atlas extending CanvasTexture so it can be passed directly
// to any Three.js material. The canvas is accessible via the inherited .image field.
//
// Items are packed into horizontal shelves. Each shelf is as tall as the first
// item placed on it; subsequent items on the same shelf must fit within that
// height. Released slots are pooled and reused before opening new shelf space.
//
// Usage:
//   const atlas = new GlyphAtlasTexture( 2048, 2048 );
//   const slot  = atlas.allocate( 'my-key', 64, 64 );   // { x, y, w, h } in pixels
//   atlas.draw( 'my-key', ( ctx, x, y, w, h ) => { ... } );
//   atlas.release( 'my-key' );

import { CanvasTexture } from 'three';

export class GlyphAtlasTexture extends CanvasTexture {

	constructor( width = 2048, height = 2048 ) {

		const canvas = document.createElement( 'canvas' );
		canvas.width = width;
		canvas.height = height;

		super( canvas );

		this.ctx = canvas.getContext( '2d' );

		// key → { x, y, w, h }
		this._slots = new Map();

		// active shelves: { y, h, nextX }
		this._shelves = [];

		// slots freed by release(), available for reuse
		this._freeList = [];

		this._nextShelfY = 0;

	}

	// Returns true if key has an allocated slot.
	has( key ) {

		return this._slots.has( key );

	}

	// Returns the slot for key, or null if not allocated.
	get( key ) {

		return this._slots.get( key ) ?? null;

	}

	// Allocates a w×h region for key and returns its { x, y, w, h } pixel rect.
	// Returns the existing slot if key is already allocated.
	// Returns null if the atlas is full.
	allocate( key, width, height ) {

		if ( this._slots.has( key ) ) {

			return this._slots.get( key );

		}

		// prefer a previously freed slot that fits
		for ( let i = 0; i < this._freeList.length; i ++ ) {

			const free = this._freeList[ i ];
			if ( free.w >= width && free.h >= height ) {

				this._freeList.splice( i, 1 );
				const slot = { x: free.x, y: free.y, w: width, h: height };
				this._slots.set( key, slot );
				return slot;

			}

		}

		// try to extend an existing shelf
		for ( const shelf of this._shelves ) {

			if ( shelf.h >= height && this.image.width - shelf.nextX >= width ) {

				const slot = { x: shelf.nextX, y: shelf.y, w: width, h: height };
				shelf.nextX += width;
				this._slots.set( key, slot );
				return slot;

			}

		}

		// open a new shelf
		if ( this._nextShelfY + height > this.image.height ) {

			return null;

		}

		const shelf = { y: this._nextShelfY, h: height, nextX: width };
		this._shelves.push( shelf );
		this._nextShelfY += height;

		const slot = { x: 0, y: shelf.y, w: width, h: height };
		this._slots.set( key, slot );
		return slot;

	}

	// Invokes callback( ctx, x, y, w, h ) clipped to the slot for key,
	// then marks the texture as needing a GPU upload.
	// No-op if key has no allocated slot.
	draw( key, callback ) {

		const slot = this._slots.get( key );
		if ( ! slot ) return;

		const { ctx } = this;
		ctx.save();
		ctx.beginPath();
		ctx.rect( slot.x, slot.y, slot.w, slot.h );
		ctx.clip();
		callback( ctx, slot.x, slot.y, slot.w, slot.h );
		ctx.restore();

		this.needsUpdate = true;

	}

	// Clears the slot for key and returns it to the free pool.
	release( key ) {

		const slot = this._slots.get( key );
		if ( ! slot ) return;

		this.ctx.clearRect( slot.x, slot.y, slot.w, slot.h );
		this._freeList.push( slot );
		this._slots.delete( key );
		this.needsUpdate = true;

	}

	// Resets the atlas to empty.
	clear() {

		this._slots.clear();
		this._shelves.length = 0;
		this._freeList.length = 0;
		this._nextShelfY = 0;
		this.ctx.clearRect( 0, 0, this.image.width, this.image.height );
		this.needsUpdate = true;

	}

}
