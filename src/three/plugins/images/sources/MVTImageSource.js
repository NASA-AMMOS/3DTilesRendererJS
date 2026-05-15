import { CanvasTexture, SRGBColorSpace } from 'three';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { RegionImageSource } from './RegionImageSource.js';
import { DataCache } from '../utils/DataCache.js';
import { VectorTileCanvasRenderer } from '../../../renderer/utils/VectorTileCanvasRenderer.js';
import { TilingScheme } from '../utils/TilingScheme.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { forEachTileInBounds } from '../overlays/utils.js';

// Fetches and caches parsed MVT tile content (vectorTile + tileBounds) keyed by (tx, ty, tl).
export class MVTContentCache extends DataCache {

	constructor( options = {} ) {

		super();

		const {
			url = null,
			levels = 20,
			tileDimension = 256,
			projection = 'EPSG:3857',
		} = options;

		this.url = url;
		this.levels = levels;
		this.tileDimension = tileDimension;
		this.projectionId = projection;

		this.tiling = new TilingScheme();
		this.fetchData = ( ...args ) => fetch( ...args );
		this.fetchOptions = {};

	}

	init() {

		const { tiling, tileDimension, levels, url, projectionId } = this;
		tiling.flipY = ! /{\s*reverseY|-\s*y\s*}/g.test( url );
		tiling.setProjection( new ProjectionScheme( projectionId ) );
		tiling.setContentBounds( ...tiling.projection.getBounds() );

		if ( Array.isArray( levels ) ) {

			levels.forEach( ( info, level ) => {

				if ( info !== null ) {

					tiling.setLevel( level, {
						tilePixelWidth: tileDimension,
						tilePixelHeight: tileDimension,
						...info,
					} );

				}

			} );

		} else {

			tiling.generateLevels( levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
				tilePixelWidth: tileDimension,
				tilePixelHeight: tileDimension,
			} );

		}

		return Promise.resolve();

	}

	async fetchItem( [ tx, ty, tl ], signal ) {

		let buffer = await this.fetchTileBuffer( tl, tx, ty, signal );

		if ( ! buffer || buffer.byteLength === 0 ) {

			return null;

		}

		const vectorTile = new VectorTile( new Protobuf( buffer ) );
		return vectorTile;

	}

	// Parsed JS objects — nothing to dispose
	disposeItem() {}

	async fetchTileBuffer( z, x, y, signal ) {

		const url = this.getUrl( x, y, z );
		const res = await this.fetchData( url, { ...this.fetchOptions, signal } );
		return res.arrayBuffer();

	}

	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*z\s*}/gi, level )
			.replace( /{\s*x\s*}/gi, x )
			.replace( /{\s*(y|reverseY|-\s*y)\s*}/gi, y );

	}

}

export class MVTImageSource extends RegionImageSource {

	get tiling() {

		return this._contentCache.tiling;

	}

	constructor( options = {} ) {

		const {
			resolution = 512,
			getStyle,
			contentCache,
			...rest
		} = options;

		super();

		this.resolution = resolution;
		this._renderer = new VectorTileCanvasRenderer( { getStyle } );
		this._contentCache = contentCache ?? new MVTContentCache( rest );

	}

	init() {

		return this._contentCache.init();

	}

	hasContent( minX, minY, maxX, maxY, level ) {

		let count = 0;
		forEachTileInBounds( [ minX, minY, maxX, maxY ], level, this._contentCache.tiling, () => count ++ );
		return count > 0;

	}

	async fetchItem( [ minX, minY, maxX, maxY, level ], _signal ) {

		const canvas = document.createElement( 'canvas' );
		canvas.width = this.resolution;
		canvas.height = this.resolution;

		const ctx = canvas.getContext( '2d' );
		const regionBounds = [ minX, minY, maxX, maxY ];
		const { _contentCache, _renderer } = this;

		const promises = [];
		forEachTileInBounds( regionBounds, level, _contentCache.tiling, ( tx, ty, tl ) => {

			promises.push( ( async () => {

				const vectorTile = await _contentCache.lock( tx, ty, tl );
				if ( vectorTile ) {

					const tileBounds = _contentCache.tiling.getTileBounds( tx, ty, tl, true, false );
					_renderer.setFrame( ctx, tileBounds, regionBounds, canvas.width, canvas.height );
					_renderer.renderToCanvas( vectorTile );

				}

			} )() );

		} );

		await Promise.all( promises	);

		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		tex._regionArgs = [ minX, minY, maxX, maxY, level ];
		return tex;

	}

	disposeItem( texture ) {

		const [ minX, minY, maxX, maxY, level ] = texture._regionArgs;
		forEachTileInBounds( [ minX, minY, maxX, maxY ], level, this._contentCache.tiling, ( tx, ty, tl ) => {

			this._contentCache.release( tx, ty, tl );

		} );

		texture.dispose();

	}

	setStyle( getStyle ) {

		this._renderer.getStyle = getStyle;

	}

	redraw() {

		this.forEachItem( ( tex, args ) => {

			const [ minX, minY, maxX, maxY, level ] = args;
			const regionBounds = [ minX, minY, maxX, maxY ];
			const canvas = tex.image;
			const ctx = canvas.getContext( '2d' );
			ctx.clearRect( 0, 0, canvas.width, canvas.height );

			forEachTileInBounds( regionBounds, level, this._contentCache.tiling, ( tx, ty, tl ) => {

				const vectorTile = this._contentCache.get( tx, ty, tl );
				if ( ! vectorTile ) return;

				const tileBounds = this._contentCache.tiling.getTileBounds( tx, ty, tl, true, false );
				this._renderer.setFrame( ctx, tileBounds, regionBounds, canvas.width, canvas.height );
				this._renderer.renderToCanvas( vectorTile );

			} );

			tex.needsUpdate = true;

		} );

	}

	dispose() {

		super.dispose();
		this._contentCache.dispose();

	}

}
