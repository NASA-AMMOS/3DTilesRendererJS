import { TiledTextureComposer } from '../overlays/TiledTextureComposer.js';
import { forEachTileInBounds } from '../overlays/utils.js';
import { DataCache } from '../utils/DataCache.js';
import { SRGBColorSpace, CanvasTexture } from 'three';

// Epsilon for comparing normalized tile bounds to determine if a region exactly matches a single
// image tile.
const BOUNDS_EPSILON = 1e-10;

export class RegionImageSource extends DataCache {

	hasContent( ...tokens ) {

		return true;

	}

}

export class TiledRegionImageSource extends RegionImageSource {

	constructor( tiledImageSource ) {

		super();
		this.tiledImageSource = tiledImageSource;
		this.tileComposer = new TiledTextureComposer();
		this.resolution = 256;
		this.IS_DIRECT_TILE = Symbol( 'IS_DIRECT_TILE' );
		this.LOCK_TOKENS = Symbol( 'LOCK_TOKENS' );

	}

	hasContent( minX, minY, maxX, maxY, level ) {

		const tiling = this.tiledImageSource.tiling;
		let total = 0;
		forEachTileInBounds( [ minX, minY, maxX, maxY ], level, tiling, () => {

			total ++;

		} );

		return total !== 0;

	}

	async fetchItem( [ minX, minY, maxX, maxY, level ], signal ) {

		const { tiledImageSource, tileComposer, IS_DIRECT_TILE, LOCK_TOKENS } = this;
		const range = [ minX, minY, maxX, maxY ];
		const tiling = tiledImageSource.tiling;
		const tokens = [ ...range, level ];

		// lock tiles for the requested level
		await this._markImages( range, level, false );

		//

		// Fast path: if the range maps to exactly one tile with matching bounds, use its
		// texture directly without compositing into an intermediate canvas to save memory.
		let singleTileBounds = null;
		let tileCount = 0;
		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			tileCount ++;
			singleTileBounds = [ tx, ty, tl ];

		} );

		if ( tileCount === 1 ) {

			const [ tx, ty, tl ] = singleTileBounds;
			const tileBounds = tiling.getTileBounds( tx, ty, tl, true, false );
			if (
				Math.abs( tileBounds[ 0 ] - minX ) <= BOUNDS_EPSILON &&
				Math.abs( tileBounds[ 1 ] - minY ) <= BOUNDS_EPSILON &&
				Math.abs( tileBounds[ 2 ] - maxX ) <= BOUNDS_EPSILON &&
				Math.abs( tileBounds[ 3 ] - maxY ) <= BOUNDS_EPSILON
			) {

				// Clone rather than returning the texture directly so each region cache entry owns
				// a distinct object. Returning the shared texture would cause symbol properties
				// to be overwritten or deleted by concurrent cache entries during race conditions,
				// (create, delete, create) leading to errors on disposal.
				// Cloning shares the underlying Source so no extra GPU memory is used.
				const clone = tiledImageSource.get( tx, ty, tl ).clone();
				clone[ IS_DIRECT_TILE ] = true;
				clone[ LOCK_TOKENS ] = tokens;
				return clone;

			}

		}

		//

		// tiles must be composed
		const canvas = document.createElement( 'canvas' );
		canvas.width = this.resolution;
		canvas.height = this.resolution;

		const target = new CanvasTexture( canvas );
		target.colorSpace = SRGBColorSpace;
		target.generateMipmaps = false;
		target[ LOCK_TOKENS ] = tokens;

		// TODO: we could draw the parent tile data here if it's available just to make sure we
		// have something to display but the texture is not usable until it returns. Though it
		// may also have minimal impact. Something to consider for the future.

		// Draw the requested level tiles
		tileComposer.setTarget( target, range );
		tileComposer.clear( 0xffffff, 0 );

		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			// draw using normalized bounds since the mercator bounds are non-linear
			const span = tiling.getTileBounds( tx, ty, tl, true, false );
			const tex = tiledImageSource.get( tx, ty, tl );
			tileComposer.draw( tex, span );

		} );

		return target;

	}

	disposeItem( target ) {

		const { IS_DIRECT_TILE, LOCK_TOKENS } = this;
		const tokens = target[ LOCK_TOKENS ];
		const [ minX, minY, maxX, maxY, level ] = tokens;

		target.dispose();
		delete target[ IS_DIRECT_TILE ];
		delete target[ LOCK_TOKENS ];

		// Unlock the component tiles using the stored tokens
		this._markImages( [ minX, minY, maxX, maxY ], level, true );

	}

	dispose() {

		super.dispose();
		this.tiledImageSource.dispose();

	}

	_markImages( range, level, release = false ) {

		const imageSource = this.tiledImageSource;
		const tiling = imageSource.tiling;

		const promises = [];
		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			if ( release ) {

				imageSource.release( tx, ty, tl );

			} else {

				promises.push( imageSource.lock( tx, ty, tl ) );

			}

		} );

		const filteredPromises = promises.filter( p => p instanceof Promise );
		if ( filteredPromises.length !== 0 ) {

			return Promise.all( filteredPromises );

		} else {

			return null;

		}

	}

}
