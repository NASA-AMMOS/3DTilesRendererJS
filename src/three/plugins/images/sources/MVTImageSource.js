import { CanvasTexture, SRGBColorSpace } from 'three';
import { RegionImageSource } from './RegionImageSource.js';
import { DataCache } from '../utils/DataCache.js';
import { VectorShapeCanvasRenderer } from '../../../renderer/utils/VectorShapeCanvasRenderer.js';
import { TilingScheme } from '../utils/TilingScheme.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { forEachTileInBounds } from '../overlays/utils.js';

let _mvtImport = null;
function importMVTDeps() {

	return _mvtImport ??= Promise.all( [
		import( '@mapbox/vector-tile' ),
		import( 'pbf' ),
	] ).then( ( [ { VectorTile }, { default: Protobuf } ] ) => ( { VectorTile, Protobuf } ) );

}

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

		const url = this.getUrl( tx, ty, tl );
		const res = await this.fetchData( url, { ...this.fetchOptions, signal } );
		const buffer = await res.arrayBuffer();
		return this._parseVectorTile( buffer );

	}

	async _parseVectorTile( buffer ) {

		if ( ! buffer || buffer.byteLength === 0 ) {

			return null;

		}

		const { VectorTile, Protobuf } = await importMVTDeps();
		return new VectorTile( new Protobuf( buffer ) );

	}

	// Parsed JS objects — nothing to dispose
	disposeItem() {}

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

	get fetchData() {

		return this._contentCache.fetchData;

	}

	set fetchData( v ) {

		this._contentCache.fetchData = v;

	}

	constructor( options = {} ) {

		const {
			resolution = 512,
			getStyle = null,
			contentCache,
			...rest
		} = options;

		super();

		this.resolution = resolution;
		this.getStyle = getStyle;
		this._renderer = new VectorShapeCanvasRenderer( { tileExtent: 4096 } );
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
					_renderer.setFrame( ctx, tileBounds, regionBounds );
					this._renderVectorTile( vectorTile );

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

	_renderVectorTile( vectorTile ) {

		const { _renderer, getStyle } = this;

		// Sort layers by user-defined order, falling back to alphabetical.
		const layerNames = [ ...Object.keys( vectorTile.layers ) ].sort( ( a, b ) => {

			if ( getStyle ) {

				const orderA = getStyle( a, null )?.order ?? VectorShapeCanvasRenderer.DEFAULT_STYLE.order;
				const orderB = getStyle( b, null )?.order ?? VectorShapeCanvasRenderer.DEFAULT_STYLE.order;
				if ( orderA !== orderB ) return orderA - orderB;

			}

			return a.localeCompare( b );

		} );

		// render each layer
		for ( const layerName of layerNames ) {

			const layer = vectorTile.layers[ layerName ];

			for ( let i = 0; i < layer.length; i ++ ) {

				const feature = layer.feature( i );
				const { properties, type } = feature;

				// Apply per-feature style; skip invisible features.
				const style = getStyle( layerName, properties );
				_renderer.setStyle( style );
				if ( ! _renderer.visible ) continue;

				// Dispatch to the appropriate draw primitive (1=point, 2=line, 3=polygon).
				const geometry = feature.loadGeometry();
				if ( type === 1 ) {

					_renderer._renderPoints( geometry );

				} else if ( type === 2 ) {

					_renderer._renderLines( geometry );

				} else if ( type === 3 ) {

					_renderer._renderPolygons( geometry );

				}

			}

		}

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
				this._renderer.setFrame( ctx, tileBounds, regionBounds );
				this._renderVectorTile( vectorTile );

			} );

			tex.needsUpdate = true;

		} );

	}

	dispose() {

		super.dispose();
		this._contentCache.dispose();

	}

}
