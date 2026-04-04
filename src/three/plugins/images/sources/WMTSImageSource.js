import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

function isCRS84( crs ) {

	return /(:84|:crs84)$/i.test( crs );

}

/**
 * @typedef {Object} WMTSTileMatrix
 * @property {string} identifier - TileMatrix identifier (e.g., 'Level0', 'EPSG:3857:0').
 * @property {number} matrixWidth - Number of tile columns at this level.
 * @property {number} matrixHeight - Number of tile rows at this level.
 * @property {number} [tileWidth] - Tile width in pixels (defaults to tileDimension).
 * @property {number} [tileHeight] - Tile height in pixels (defaults to tileDimension).
 * @property {number[]} tileBounds - Tile grid bounds in radians `[west, south, east, north]`.
 *   Required because the actual coverage depends on TopLeftCorner and ScaleDenominator
 *   from the capabilities XML and cannot be computed from grid dimensions alone.
 */

/**
 * @typedef {Object} WMTSImageSourceOptions
 * @property {string} url - WMTS service URL. For KVP mode, this is the base endpoint.
 *   For RESTful mode, include template variables: `{TileMatrixSet}`, `{TileMatrix}`,
 *   `{TileRow}`, `{TileCol}`, `{Style}`.
 * @property {string} layer - WMTS layer identifier.
 * @property {string} tileMatrixSet - TileMatrixSet identifier (e.g., 'GoogleMapsCompatible', 'EPSG:3857').
 * @property {string} [style='default'] - Style identifier.
 * @property {string} [format='image/jpeg'] - Output image format (e.g., 'image/png', 'image/jpeg').
 * @property {Object<string, string>|null} [dimensions=null] - WMTS dimension values
 *   (e.g., `{ TIME: '2024-01-01' }`). Used in both KVP and RESTful modes.
 * @property {string[]|null} [tileMatrixLabels=null] - Custom TileMatrix identifiers per level
 *   (Tier 2). If provided, these labels replace numeric level indices in requests.
 * @property {WMTSTileMatrix[]|null} [tileMatrices=null] - Explicit per-level tile matrix definitions
 *   (Tier 3). When provided, `levels` and `tileMatrixLabels` are ignored.
 * @property {string|null} [projection=null] - Projection identifier ('EPSG:3857' or 'EPSG:4326').
 *   Defaults to 'EPSG:3857' if not specified.
 * @property {number} [levels=20] - Number of zoom levels (Tier 1 & 2). Ignored if `tileMatrices` is provided.
 * @property {number} [tileDimension=256] - Default tile width and height in pixels.
 * @property {number[]|null} [contentBoundingBox=null] - Content bounding box in radians
 *   `[west, south, east, north]`. If null, uses full projection bounds.
 */

/**
 * Redesigned WMTS (Web Map Tile Service) image source.
 *
 * All configuration is via literal values -- no capabilities dependency,
 * following Cesium's WebMapTileServiceImageryProvider pattern.
 *
 * Three tiers of configuration complexity:
 *
 * Tier 1 - Standard grid (~80% of services):
 *   Just `url`, `layer`, `tileMatrixSet`, `projection`, and optionally `levels`.
 *   Assumes standard power-of-two doubling grid.
 *
 * Tier 2 - Standard grid with custom labels (~15%):
 *   Adds `tileMatrixLabels` (string[]) to map zoom levels to non-numeric
 *   TileMatrix identifiers (e.g., 'EPSG:3857:0', 'EPSG:3857:1', ...).
 *
 * Tier 3 - Non-standard grid (~5%):
 *   Uses explicit `tileMatrices` array with per-level definitions including
 *   `identifier`, `matrixWidth`, `matrixHeight`, and optional `tileWidth`/`tileHeight`.
 *   When provided, `levels` and `tileMatrixLabels` are ignored.
 *
 * Supports both KVP and RESTful request modes with automatic detection.
 * If the URL contains template variables, RESTful mode is used;
 * otherwise KVP query parameters are appended.
 *
 * Note: `contentBoundingBox` is specified in radians `[west, south, east, north]`.
 *
 * @extends TiledImageSource
 */
export class WMTSImageSource extends TiledImageSource {

	/**
	 * @param {WMTSImageSourceOptions} options - Configuration options.
	 */
	constructor( options = {} ) {

		const {
			capabilities = null,
			layer = null,
			tileMatrixSet = 'default',
			style = 'default',
			url = null,
			format = 'image/jpeg',
			dimensions = null,
			tileMatrixLabels = null,
			tileMatrices = null,
			projection = null,
			levels = 20,
			tileDimension = 256,
			contentBoundingBox = null,
			...rest
		} = options;

		super( rest );

		this.capabilities = capabilities;
		this.layer = layer;
		this.tileMatrixSet = tileMatrixSet;
		this.style = style;
		this.url = url;
		this.format = format;
		this.dimensions = dimensions;
		this.tileMatrixLabels = tileMatrixLabels;
		this.tileMatrices = tileMatrices;
		this.projection = projection;
		this.levels = levels;
		this.tileDimension = tileDimension;
		this.contentBoundingBox = contentBoundingBox;

		this._useKvp = false;

	}

	/**
	 * Detects whether the URL uses KVP or RESTful mode.
	 * If the URL contains no template variables, it is considered a KVP endpoint.
	 */
	_detectRequestMode( url ) {

		return ! /\{/.test( url );

	}

	/**
	 * @deprecated Resolves legacy capabilities-based options into literal fields.
	 */
	_resolveCapabilities() {

		const capabilities = this.capabilities;
		if ( ! capabilities ) {

			return;

		}

		console.warn( 'WMTSImageSource: The "capabilities" option has been deprecated. Use literal options instead.' );

		let layer = this.layer;
		if ( ! layer ) {

			layer = capabilities.layers[ 0 ];

		} else if ( typeof layer === 'string' ) {

			layer = capabilities.layers.find( l => l.identifier === layer );

		}

		let tileMatrixSet = this.tileMatrixSet;
		if ( ! tileMatrixSet || tileMatrixSet === 'default' ) {

			tileMatrixSet = layer.tileMatrixSets[ 0 ];

		} else if ( typeof tileMatrixSet === 'string' ) {

			tileMatrixSet = layer.tileMatrixSets.find( tms => tms.identifier === tileMatrixSet );

		}

		if ( ! this.style || this.style === 'default' ) {

			const defaultStyle = layer.styles.find( s => s.isDefault );
			if ( defaultStyle ) this.style = defaultStyle.identifier;

		}

		if ( ! this.url ) {

			this.url = layer.resourceUrls[ 0 ].template;

		}

		const supportedCRS = tileMatrixSet.supportedCRS;
		if ( ! this.projection ) {

			this.projection = ( supportedCRS.includes( '4326' ) || isCRS84( supportedCRS ) )
				? 'EPSG:4326' : 'EPSG:3857';

		}

		if ( ! this.contentBoundingBox && layer.boundingBox ) {

			this.contentBoundingBox = layer.boundingBox.bounds;

		}

		if ( ! this.tileMatrices ) {

			this.tileMatrices = tileMatrixSet.tileMatrices;

		}

		const mergedDimensions = {};
		layer.dimensions.forEach( dim => {

			mergedDimensions[ dim.identifier ] = dim.defaultValue;

		} );

		if ( this.dimensions ) {

			Object.assign( mergedDimensions, this.dimensions );

		}

		this.dimensions = mergedDimensions;
		this.tileMatrixSet = tileMatrixSet.identifier;
		this.layer = layer.identifier;
		this.capabilities = null;

	}

	init() {

		this._resolveCapabilities();

		const {
			tiling,
			tileDimension,
			levels,
			dimensions,
			contentBoundingBox,
			tileMatrices,
			style,
			tileMatrixSet,
		} = this;

		let { url } = this;

		// Determine projection
		const projectionScheme = this.projection || 'EPSG:3857';

		// Setup tiling
		tiling.flipY = true;
		tiling.setProjection( new ProjectionScheme( projectionScheme ) );

		if ( contentBoundingBox !== null ) {

			tiling.setContentBounds(
				contentBoundingBox[ 0 ],
				contentBoundingBox[ 1 ],
				contentBoundingBox[ 2 ],
				contentBoundingBox[ 3 ],
			);

		} else {

			tiling.setContentBounds( ...tiling.projection.getBounds() );

		}

		// Tiered initialization
		if ( Array.isArray( tileMatrices ) ) {

			// Tier 3: Explicit per-level tile matrix definitions.
			tileMatrices.forEach( ( tm, i ) => {

				const tw = tm.tileWidth || tileDimension;
				const th = tm.tileHeight || tileDimension;

				tiling.setLevel( i, {
					tilePixelWidth: tw,
					tilePixelHeight: th,
					tileCountX: tm.matrixWidth,
					tileCountY: tm.matrixHeight,
					tileBounds: tm.tileBounds || tm.bounds,
				} );

			} );

		} else {

			// Tier 1 & 2: Standard power-of-two doubling grid
			tiling.generateLevels(
				levels,
				tiling.projection.tileCountX,
				tiling.projection.tileCountY,
				{
					tilePixelWidth: tileDimension,
					tilePixelHeight: tileDimension,
				},
			);

		}

		// Detect request mode
		this._useKvp = this._detectRequestMode( url );

		if ( ! this._useKvp ) {

			// RESTful: pre-fill static template values
			url = url
				.replace( /{\s*TileMatrixSet\s*}/gi, tileMatrixSet )
				.replace( /{\s*Style\s*}/gi, style );

			if ( dimensions ) {

				for ( const key in dimensions ) {

					url = url.replace( new RegExp( `{\\s*${ key }\\s*}`, 'gi' ), dimensions[ key ] );

				}

			}

		}

		this.url = url;

		return Promise.resolve();

	}

	getUrl( x, y, level ) {

		const { tileMatrices, tileMatrixLabels } = this;

		// Determine the TileMatrix identifier for this level (tier priority: 3 > 2 > 1)
		let tileMatrix;
		if ( tileMatrices !== null && tileMatrices.length > 0 ) {

			tileMatrix = tileMatrices[ level ].identifier;

		} else if ( tileMatrixLabels ) {

			tileMatrix = tileMatrixLabels[ level ];

		} else {

			tileMatrix = level.toString();

		}

		if ( this._useKvp ) {

			return this._buildKvpUrl( x, y, tileMatrix );

		}

		return this._buildRestfulUrl( x, y, tileMatrix );

	}

	_buildRestfulUrl( x, y, tileMatrix ) {

		return this.url
			.replace( /{\s*TileMatrix\s*}/gi, tileMatrix )
			.replace( /{\s*TileCol\s*}/gi, x )
			.replace( /{\s*TileRow\s*}/gi, y );

	}

	_buildKvpUrl( x, y, tileMatrix ) {

		const { dimensions, format } = this;
		const baseUrl = this.url;

		const params = new URLSearchParams( {
			SERVICE: 'WMTS',
			VERSION: '1.0.0',
			REQUEST: 'GetTile',
			LAYER: this.layer,
			STYLE: this.style,
			TILEMATRIXSET: this.tileMatrixSet,
			TILEMATRIX: tileMatrix,
			TILEROW: y,
			TILECOL: x,
			FORMAT: format,
		} );

		if ( dimensions ) {

			for ( const key in dimensions ) {

				params.set( key, dimensions[ key ] );

			}

		}

		const separator = baseUrl.includes( '?' ) ? '&' : '?';
		return baseUrl + separator + params.toString();

	}

}
