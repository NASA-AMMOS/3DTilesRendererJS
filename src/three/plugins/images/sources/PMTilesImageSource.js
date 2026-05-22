import { MVTContentCache, MVTImageSource } from './MVTImageSource.js';
import { TiledImageSource } from './TiledImageSource.js';
import { RegionImageSource, TiledRegionImageSource } from './RegionImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

const DEG2RAD = Math.PI / 180;

let _pmtilesImport = null;
function importPMTiles() {

	return _pmtilesImport ??= import( 'pmtiles' ).then( m => m.PMTiles );

}

// Fetches individual raster tiles from a PMTiles instance and converts them to textures.
class PMTilesRasterTileSource extends TiledImageSource {

	constructor( instance, tiling ) {

		super();
		this.instance = instance;
		this.tiling = tiling;

	}

	async fetchItem( [ tx, ty, tl ], signal ) {

		const res = await this.instance.getZxy( tl, tx, ty, signal );
		if ( ! res || ! res.data || res.data.byteLength === 0 ) {

			return null;

		} else {

			return this.processBufferToTexture( res.data );

		}

	}

}

class PMTilesContentCache extends MVTContentCache {

	constructor( options = {} ) {

		super( options );
		this.instance = null;
		this.tileType = 1;

	}

	async init() {

		const { tiling } = this;

		const PMTiles = await importPMTiles();

		// Custom Source routes all PMTiles range requests through fetchData so they
		// go through the shared download queue rather than PMTiles' internal fetch.
		this.instance = new PMTiles( {
			getKey: () => this.url,
			getBytes: async ( offset, length, signal ) => {

				const { fetchOptions, url } = this;
				const res = await this.fetchData( url, {
					...fetchOptions,
					signal,
					headers: {
						...fetchOptions.headers,
						range: `bytes=${ offset }-${ offset + length - 1 }`,
					},
				} );

				if ( ! res.ok ) {

					throw new Error( `PMTilesImageSource: Bad response code: ${ res.status }` );

				}

				if ( res.status !== 206 ) {

					throw new Error( 'PMTilesImageSource: Server does not support HTTP Byte Serving.' );

				}

				return {
					data: await res.arrayBuffer(),
					etag: res.headers.get( 'ETag' ),
					cacheControl: res.headers.get( 'Cache-Control' ),
					expires: res.headers.get( 'Expires' ),
				};

			},
		} );

		const header = await this.instance.getHeader();
		this.tileType = header.tileType;

		const projection = new ProjectionScheme( 'EPSG:3857' );

		tiling.flipY = true;
		tiling.setProjection( projection );
		tiling.setContentBounds(
			DEG2RAD * header.minLon,
			DEG2RAD * header.minLat,
			DEG2RAD * header.maxLon,
			DEG2RAD * header.maxLat,
		);
		tiling.generateLevels( header.maxZoom + 1, projection.tileCountX, projection.tileCountY, {
			tilePixelWidth: 512,
			tilePixelHeight: 512,
			minLevel: header.minZoom,
		} );

	}

	async fetchItem( [ tx, ty, tl ], signal ) {

		const res = await this.instance.getZxy( tl, tx, ty, signal );
		return this._parseVectorTile( res ? res.data : null );

	}

}

// TODO: this should probably be a form of proxy
export class PMTilesImageSource extends RegionImageSource {

	get tiling() {

		return this._contentCache.tiling;

	}

	get fetchData() {

		return this._contentCache.fetchData;

	}

	set fetchData( v ) {

		this._contentCache.fetchData = v;

	}

	get resolution() {

		return this._resolution;

	}

	set resolution( v ) {

		this._resolution = v;
		if ( this._deferredSource ) {

			this._deferredSource.resolution = v;

		}

	}

	get fetchOptions() {

		return this._contentCache.fetchOptions;

	}

	set fetchOptions( v ) {

		this._contentCache.fetchOptions = v;

	}

	constructor( options = {} ) {

		super();

		const {
			resolution = 512,
			getStyle = () => null,
		} = options;

		this._resolution = resolution;
		this._getStyle = getStyle;
		this._contentCache = new PMTilesContentCache( options );
		this._deferredSource = null;
		this.isVectorTile = false;

	}

	async init() {

		await this._contentCache.init();
		const { _contentCache } = this;

		this.isVectorTile = _contentCache.tileType === 1;

		if ( this.isVectorTile ) {

			this._deferredSource = new MVTImageSource( {
				resolution: this._resolution,
				getStyle: this._getStyle,
				contentCache: _contentCache,
			} );

		} else {

			const rasterSource = new PMTilesRasterTileSource( _contentCache.instance, _contentCache.tiling );
			this._deferredSource = new TiledRegionImageSource( rasterSource );
			this._deferredSource.resolution = this._resolution;

		}

	}

	hasContent( minX, minY, maxX, maxY, level ) {

		return this._deferredSource.hasContent( minX, minY, maxX, maxY, level );

	}

	lock( ...args ) {

		return this._deferredSource.lock( ...args );

	}

	release( ...args ) {

		this._deferredSource.release( ...args );

	}

	get( ...args ) {

		return this._deferredSource.get( ...args );

	}

	redraw( ...args ) {

		if ( this._deferredSource instanceof MVTImageSource ) {

			this._deferredSource.redraw( ...args );

		}

	}

	forEachItem( ...args ) {

		return this._deferredSource.forEachItem( ...args );

	}

	dispose() {

		super.dispose();
		this._contentCache.dispose();
		if ( this._deferredSource ) {

			this._deferredSource.dispose();

		}

	}

}
