import { MVTGlyphs } from './MVTGlyphs.js';

/**
 * Renders one icon glyph per point annotation. Each item's atlas key comes from `getKind`, or
 * `fallback` when that key isn't in the atlas.
 * @extends MVTGlyphs
 */
export class MVTIconGlyphs extends MVTGlyphs {

	/**
	 * @param {Object} [options]
	 * @param {( layer: string, properties: Object ) => ( string | null )} [options.getKind] - Returns
	 * the atlas key for an item, or null.
	 * @param {string|null} [options.fallback=null] - Atlas key drawn when `getKind`'s result is
	 * missing from the atlas; null draws nothing.
	 * @param {number} [options.size=18] - Glyph size in pixels.
	 * @param {number} [options.glyphSize] - Atlas slot size in pixels (defaults to `18 * devicePixelRatio`).
	 * @param {number} [options.slotCount=64] - Initial atlas slot capacity.
	 */
	constructor( options = {} ) {

		const {
			getKind = () => null,
			fallback = null,
			size = 18,
			glyphSize = 18 * window.devicePixelRatio,
			slotCount = 64,
		} = options;

		super();

		/**
		 * Returns the atlas key for a given item, or null for none.
		 * @type {( layer: string, properties: Object ) => ( string | null )}
		 */
		this.getKind = getKind;

		/**
		 * Atlas key used when `getKind`'s result isn't present in the atlas ( null draws nothing ).
		 * @type {string|null}
		 */
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
