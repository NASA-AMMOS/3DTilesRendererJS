/** @import { VectorTileStyle } from './utils/VectorShapeCanvasRenderer.js' */
import { ImageOverlay } from './ImageOverlayPlugin.js';
import { MVTImageSource } from './sources/MVTImageSource.js';
import { PMTilesImageSource } from './sources/PMTilesImageSource.js';
import { PriorityQueue } from '3d-tiles-renderer/core';

/**
 * @callback MVTGetStyleCallback
 * @param {string} layerName Name of the MVT layer the feature belongs to.
 * @param {Object|null} properties Feature properties, or `null` when queried for layer-level sort order only.
 * @returns {VectorTileStyle|null} Style to apply, or `null` to use defaults.
 */

/**
 * Overlay that renders XYZ-template MVT vector tiles on top of 3D tile geometry.
 * See the {@link https://github.com/mapbox/vector-tile-spec Mapbox Vector Tile specification}.
 *
 * Requires the optional peer dependencies `@mapbox/vector-tile` and `pbf`, which are
 * imported dynamically on first use and must be installed separately:
 * ```
 * npm install @mapbox/vector-tile pbf
 * ```
 * @extends ImageOverlay
 * @param {Object} [options]
 * @param {string} [options.url] URL template with `{x}`, `{y}`, `{z}` placeholders.
 * @param {number} [options.levels=20] Number of zoom levels.
 * @param {string} [options.projection='EPSG:3857'] Projection scheme identifier.
 * @param {number} [options.resolution=512] Canvas resolution for generated tile textures.
 * @param {MVTGetStyleCallback} [options.getStyle] Per-feature style callback. If not provided then no content will draw.
 */
export class MVTOverlay extends ImageOverlay {

	get tiling() {

		return this.imageSource.tiling;

	}

	get projection() {

		return this.tiling.projection;

	}

	get aspectRatio() {

		return this.tiling && this.isReady ? this.tiling.aspectRatio : 1;

	}

	get fetchOptions() {

		return this.imageSource.fetchOptions;

	}

	set fetchOptions( v ) {

		this.imageSource.fetchOptions = v;

	}

	constructor( options = {} ) {

		super( options );
		this.imageSource = options.imageSource ?? new MVTImageSource( options );

		this._redrawQueue = new PriorityQueue();
		this._redrawQueue.maxJobs = 4;
		this._redrawQueue.priorityCallback = () => 0;

	}

	_init() {

		this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
		return this.imageSource.init();

	}

	calculateLevel( range ) {

		const [ minX, minY, maxX, maxY ] = range;
		const w = maxX - minX;
		const h = maxY - minY;
		const resolution = this.imageSource.resolution;
		const maxLevel = this.tiling.maxLevel;

		let level = 0;
		for ( ; level < maxLevel; level ++ ) {

			const levelData = this.tiling.getLevel( level );
			if ( levelData === null || levelData === undefined ) {

				continue;

			}

			const { pixelWidth, pixelHeight } = levelData;
			if ( pixelWidth >= resolution / w || pixelHeight >= resolution / h ) {

				break;

			}

		}

		return level;

	}

	hasContent( range ) {

		return this.imageSource.hasContent( ...range, this.calculateLevel( range ) );

	}

	getTexture( range ) {

		return this.imageSource.get( ...range, this.calculateLevel( range ) );

	}

	lockTexture( range ) {

		return this.imageSource.lock( ...range, this.calculateLevel( range ) );

	}

	releaseTexture( range ) {

		this.imageSource.release( ...range, this.calculateLevel( range ) );

	}

	setResolution( resolution ) {

		this.imageSource.resolution = resolution;

	}

	shouldSplit( range ) {

		return true;

	}

	setRegionVisible( range, visible ) {

		super.setRegionVisible( range, visible );

		if ( visible ) {

			const { _redrawQueue } = this;
			const key = range.join( '_' ) + '_' + this.calculateLevel( range );
			if ( _redrawQueue.has( key ) ) {

				_redrawQueue.flush( key );

			}

		}

	}

	redraw() {

		const {
			imageSource,
			_redrawQueue,
			_visibleRegionCounts,
		} = this;

		for ( const { range } of _visibleRegionCounts.values() ) {

			imageSource.redraw( ...range, this.calculateLevel( range ) );

		}

		imageSource.forEachItem( ( _, args ) => {

			const key = args.join( '_' );
			if ( ! _visibleRegionCounts.has( key ) && ! _redrawQueue.has( key ) ) {

				_redrawQueue.add( key, () => {

					imageSource.redraw( ...args );

				} );

			}

		} );

	}

}

/**
 * Overlay that renders PMTiles vector or raster data on top of 3D tile geometry.
 * Projection and zoom levels are read automatically from the PMTiles archive header.
 *
 * Requires the optional peer dependency `pmtiles`, which is imported dynamically on first use
 * and must be installed separately. Vector archives additionally require `@mapbox/vector-tile`
 * and `pbf`:
 * ```
 * npm install pmtiles @mapbox/vector-tile pbf
 * ```
 * @extends MVTOverlay
 * @param {Object} [options]
 * @param {string} [options.url] URL to the `.pmtiles` archive.
 * @param {number} [options.resolution=512] Canvas resolution for generated tile textures.
 * @param {MVTGetStyleCallback} [options.getStyle] Per-feature style callback. Only applies to vector archives.
 */
export class PMTilesOverlay extends MVTOverlay {

	constructor( options = {} ) {

		super( { ...options, imageSource: new PMTilesImageSource( options ) } );

	}

	shouldSplit( range ) {

		// Vector archives can always split further for higher-resolution rasterization.
		// Raster archives are capped at their max data zoom level.
		if ( this.imageSource.isVectorTile ) {

			return true;

		} else {

			return this.tiling.maxLevel > this.calculateLevel( range );

		}

	}

}
