import { TiledTextureComposer } from '../overlays/TiledTextureComposer.js';
import { forEachTileInBounds } from '../overlays/utils.js';
import { DataCache } from '../utils/DataCache.js';
import { SRGBColorSpace, CanvasTexture } from 'three';

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

		const range = [ minX, minY, maxX, maxY ];
		const imageSource = this.tiledImageSource;
		const tileComposer = this.tileComposer;
		const tiling = imageSource.tiling;

		const canvas = document.createElement( 'canvas' );
		canvas.width = this.resolution;
		canvas.height = this.resolution;

		const target = new CanvasTexture( canvas );
		target.colorSpace = SRGBColorSpace;
		target.generateMipmaps = false;
		target.tokens = [ ...range, level ];

		// Start locking tiles for the requested level
		await this._markImages( range, level, false );

		// TODO: we could draw the parent tile data here if it's available just to make sure we
		// have something to display but the texture is not usable until it returns. Though it
		// may also have minimal impact. Something to consider for the future.

		// Draw the requested level tiles
		tileComposer.setTarget( target, range );
		tileComposer.clear( 0xffffff, 0 );

		forEachTileInBounds( range, level, tiling, ( tx, ty, tl ) => {

			// draw using normalized bounds since the mercator bounds are non-linear
			const span = tiling.getTileBounds( tx, ty, tl, true, false );
			const tex = imageSource.get( tx, ty, tl );
			tileComposer.draw( tex, span );

		} );

		return target;

	}

	disposeItem( target ) {

		target.dispose();

		// Unlock the component tiles using the tokens stored on the target
		const [ minX, minY, maxX, maxY, level ] = target.tokens;
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
