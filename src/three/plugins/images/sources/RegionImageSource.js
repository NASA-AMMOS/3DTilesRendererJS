import { TiledTextureComposer } from '../overlays/TiledTextureComposer.js';
import { forEachTileInBounds } from '../overlays/utils.js';
import { DataCache } from '../utils/DataCache.js';
import { SRGBColorSpace, CanvasTexture } from 'three';

// Epsilon for comparing normalized tile bounds to determine if a region exactly matches a single
// image tile.
const BOUNDS_EPSILON = 1e-10;

function isArrayEqual( a, b, eps = 0 ) {

	if ( a.length !== b.length ) {

		return false;

	}

	for ( let i = 0, l = a.length; i < l; i ++ ) {

		if ( Math.abs( a[ i ] - b[ i ] ) > eps ) {

			return false;

		}

	}

	return true;

}

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

		const { tiledImageSource, tileComposer } = this;
		const range = [ minX, minY, maxX, maxY ];
		const tiling = tiledImageSource.tiling;

		// lock tiles for the requested level
		await this._markImages( range, level, false );

		if ( signal && signal.aborted ) {

			return null;

		}

		// Fast path: if the range maps to exactly one tile with matching bounds, use its
		// texture directly without compositing into an intermediate canvas to save memory.
		let singleTileBounds = null;
		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			const thisBounds = tiling.getTileBounds( tx, ty, tl, true, false );
			if ( isArrayEqual( thisBounds, range, BOUNDS_EPSILON ) ) {

				singleTileBounds = [ tx, ty, tl ];

			}

		} );

		if ( singleTileBounds !== null ) {

			// Clone rather than returning the texture directly so each region cache entry owns
			// a distinct object. Returning the shared texture would cause concurrent cache entries
			// to alias the same object, leading to errors on disposal.
			// Cloning shares the underlying Source so no extra GPU memory is used.
			const [ tx, ty, tl ] = singleTileBounds;
			const clone = tiledImageSource.get( tx, ty, tl ).clone();

			return clone;

		}

		//

		// Compose path: tiles must be composed into a single texture
		const canvas = document.createElement( 'canvas' );
		canvas.width = this.resolution;
		canvas.height = this.resolution;

		const target = new CanvasTexture( canvas );
		target.colorSpace = SRGBColorSpace;
		target.generateMipmaps = false;

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

	disposeItem( target, [ minX, minY, maxX, maxY, level ] ) {

		if ( target ) {

			target.dispose();

		}

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
