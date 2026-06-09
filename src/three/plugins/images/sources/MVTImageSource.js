import { CanvasTexture, SRGBColorSpace } from 'three';
import { RegionImageSource } from './RegionImageSource.js';
import { DataCache } from '../utils/DataCache.js';
import { VectorShapeCanvasRenderer } from '../utils/VectorShapeCanvasRenderer.js';
import { TilingScheme } from '../utils/TilingScheme.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { forEachTileInBounds } from '../overlays/utils.js';

let _mvtImport = null;
function importMVTDeps() {

	return _mvtImport ??= Promise.all( [
		import( '@mapbox/vector-tile' ),
		import( 'pbf' ),
	] ).then( ( [ { VectorTile }, { default: Protobuf } ] ) => {

		return { VectorTile, Protobuf };

	} );

}

// Fetches and caches parsed MVT tile content (vectorTile + tileBounds) keyed by (tx, ty, tl).
export class MVTContentCache extends DataCache {

	constructor( options = {} ) {

		super();

		const {
			url = null,
			levels = 20,
			projection = 'EPSG:3857',
		} = options;

		this.url = url;
		this.levels = levels;
		this.projectionId = projection;

		this.tiling = new TilingScheme();
		this.fetchData = ( ...args ) => fetch( ...args );
		this.fetchOptions = {};

	}

	init() {

		const { tiling, levels, url, projectionId } = this;
		tiling.flipY = ! /{\s*reverseY|-\s*y\s*}/g.test( url );
		tiling.setProjection( new ProjectionScheme( projectionId ) );
		tiling.setContentBounds( ...tiling.projection.getBounds() );

		// 512 is used as the reference tile size for zoom level selection, matching the approach
		// used by Maplibre GL JS (see coveringZoomLevel in maplibre-gl-js/src/geo/projection/covering_tiles.ts).
		const TILE_SIZE = 512;
		if ( Array.isArray( levels ) ) {

			levels.forEach( ( info, level ) => {

				if ( info !== null ) {

					tiling.setLevel( level, {
						tilePixelWidth: TILE_SIZE,
						tilePixelHeight: TILE_SIZE,
						...info,
					} );

				}

			} );

		} else {

			tiling.generateLevels( levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
				tilePixelWidth: TILE_SIZE,
				tilePixelHeight: TILE_SIZE,
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

	get fetchOptions() {

		return this._contentCache.fetchOptions;

	}

	set fetchOptions( v ) {

		this._contentCache.fetchOptions = v;

	}

	constructor( options = {} ) {

		const {
			resolution = 512,
			getStyle = () => null,
			contentCache,
			...rest
		} = options;

		super();

		this.resolution = resolution;
		this.getStyle = getStyle;
		this._canvasRenderer = new VectorShapeCanvasRenderer( { tileExtent: 4096 } );
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

	async fetchItem( [ minX, minY, maxX, maxY, level ], signal ) {

		const { resolution, _contentCache } = this;
		const canvas = document.createElement( 'canvas' );
		canvas.width = resolution;
		canvas.height = resolution;

		const regionBounds = [ minX, minY, maxX, maxY ];

		const promises = [];
		forEachTileInBounds( regionBounds, level, _contentCache.tiling, ( tx, ty, tl ) => {

			promises.push( _contentCache.lock( tx, ty, tl ) );

		} );

		await Promise.all( promises );

		if ( signal && signal.aborted ) {

			return null;

		}

		this._drawToCanvas( canvas, regionBounds, level );

		const tex = new CanvasTexture( canvas );
		tex.colorSpace = SRGBColorSpace;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		return tex;

	}

	disposeItem( texture, [ minX, minY, maxX, maxY, level ] ) {

		forEachTileInBounds( [ minX, minY, maxX, maxY ], level, this._contentCache.tiling, ( tx, ty, tl ) => {

			this._contentCache.release( tx, ty, tl );

		} );

		if ( texture ) {

			texture.dispose();

		}

	}

	redraw( ...args ) {

		const [ minX, minY, maxX, maxY, level ] = args;
		const tex = this.get( minX, minY, maxX, maxY, level );
		if ( ! tex ) {

			return;

		}

		this._drawToCanvas( tex.image, [ minX, minY, maxX, maxY ], level );
		tex.needsUpdate = true;

	}

	dispose() {

		super.dispose();
		this._contentCache.dispose();

	}

	_drawToCanvas( canvas, regionBounds, level ) {

		const { _contentCache, _canvasRenderer } = this;
		const ctx = canvas.getContext( '2d' );
		forEachTileInBounds( regionBounds, level, _contentCache.tiling, ( tx, ty, tl ) => {

			const tileBounds = _contentCache.tiling.getTileBounds( tx, ty, tl, true, false );
			_canvasRenderer.setFrame( ctx, tileBounds, regionBounds );

			const vectorTile = _contentCache.get( tx, ty, tl );
			if ( vectorTile ) {

				this._renderVectorTile( vectorTile );

			}

		} );

	}

	_renderVectorTile( vectorTile ) {

		const { _canvasRenderer, getStyle } = this;

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
				_canvasRenderer.setStyle( style );

				// Dispatch to the appropriate draw primitive (1=point, 2=line, 3=polygon).
				const geometry = feature.loadGeometry();
				if ( type === 1 ) {

					_canvasRenderer._renderPoints( geometry );

				} else if ( type === 2 ) {

					_canvasRenderer._renderLines( geometry );

				} else if ( type === 3 ) {

					_canvasRenderer._renderPolygons( geometry );

				}

			}

		}

	}

}
