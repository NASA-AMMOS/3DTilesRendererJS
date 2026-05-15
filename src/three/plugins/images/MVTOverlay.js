import { ImageOverlay } from './ImageOverlayPlugin.js';
import { MVTImageSource } from './sources/MVTImageSource.js';
import { PMTilesImageSource } from './sources/PMTilesImageSource.js';

/**
 * Overlay that renders XYZ-template MVT vector tiles on top of 3D tile geometry.
 * See the {@link https://github.com/mapbox/vector-tile-spec Mapbox Vector Tile specification}.
 * @extends ImageOverlay
 * @param {Object} [options]
 * @param {string} [options.url] URL template with `{x}`, `{y}`, `{z}` placeholders.
 * @param {number} [options.levels=20] Number of zoom levels.
 * @param {number} [options.tileDimension=256] Tile pixel size.
 * @param {string} [options.projection='EPSG:3857'] Projection scheme identifier.
 * @param {number} [options.resolution=512] Canvas resolution for generated tile textures.
 * @param {Object} [options.styles] Per-layer color overrides.
 * @param {Function} [options.filter] Feature filter callback `(feature, layerName) => boolean`.
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

	constructor( options = {} ) {

		super( options );
		this.imageSource = options.imageSource ?? new MVTImageSource( options );

	}

	_init() {

		return this.imageSource.init().then( () => {

			this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );

		} );

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

		return this.tiling.maxLevel > this.calculateLevel( range );

	}

	setStyles( styles, filter ) {

		this.imageSource.setStyles( styles, filter );

	}

	redraw() {

		this.imageSource.redraw();

	}

}

/**
 * Overlay that renders PMTiles (MVT) vector data on top of 3D tile geometry.
 * Pass a PMTiles archive URL; the source projection and zoom levels are read
 * from the archive header automatically.
 * @extends MVTOverlay
 * @param {Object} [options]
 * @param {string} [options.url] URL to the `.pmtiles` archive.
 * @param {number} [options.resolution=512] Canvas resolution for generated tile textures.
 * @param {number} [options.tileDimension=256] Tile pixel size used when generating tiling levels.
 * @param {Object} [options.styles] Per-layer color overrides.
 * @param {Function} [options.filter] Feature filter callback `(feature, layerName) => boolean`.
 */
export class PMTilesOverlay extends MVTOverlay {

	constructor( options = {} ) {

		super( { ...options, imageSource: new PMTilesImageSource( options ) } );

	}

}
