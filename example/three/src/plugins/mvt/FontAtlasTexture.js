import { GlyphAtlasTexture } from '3d-tiles-renderer/plugins';

export class FontAtlasTexture extends GlyphAtlasTexture {

	constructor( slotCount, slotSize, font, color = 'white' ) {

		super( slotCount, slotSize );

		this.font = font;
		this.color = color;
		this._refCounts = new Map();
		this._evictionQueue = new Set();

	}

	// Increments the reference count for char, drawing it into the atlas if not already present.
	// Returns the slot { x, y, w, h }.
	add( char ) {

		const {
			_refCounts,
			_evictionQueue,
			font,
			color,
		} = this;

		if ( this.has( char ) ) {

			// already in atlas — pull it out of the eviction queue
			_evictionQueue.delete( char );
			_refCounts.set( char, _refCounts.get( char ) + 1 );

		} else {

			if ( this.isFull ) {

				const candidate = _evictionQueue.values().next().value;
				if ( candidate === undefined ) {

					throw new Error( 'FontAtlasTexture: atlas is full.' );

				}

				_evictionQueue.delete( candidate );
				_refCounts.delete( candidate );
				super.release( candidate );

			}

			this.drawChar( char, char, { font, color } );
			_refCounts.set( char, 1 );

		}

		return this.get( char );

	}

	// Decrements the reference count for char. The slot is kept in the atlas
	// and only evicted when space is needed for a new glyph.
	release( char ) {

		const { _refCounts, _evictionQueue } = this;
		const count = _refCounts.get( char ) ?? 0;
		if ( count <= 1 ) {

			_refCounts.set( char, 0 );
			_evictionQueue.add( char );

		} else {

			_refCounts.set( char, count - 1 );

		}

	}

}
