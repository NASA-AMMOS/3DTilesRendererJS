import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';

/**
 * Check if the CRS is CRS84 (WGS84 Geographic)
 * @private
 * @param {string} crs - The CRS identifier string
 * @returns {boolean} True if the CRS is CRS84
 */
function isCRS84( crs ) {

	return /(:84|:crs84)$/i.test( crs );

}

/**
 * WMTS (Web Map Tile Service) image source for loading tiled map imagery.
 *
 * This class provides support for loading map tiles from WMTS-compliant services.
 * It handles parsing WMTS capabilities documents and constructing proper tile URLs.
 *
 * @extends TiledImageSource
 *
 * @example
 * // Basic usage with WMTSCapabilitiesLoader
 * import { WMTSCapabilitiesLoader, WMTSTilesPlugin } from '3d-tiles-renderer/plugins';
 *
 * // Load capabilities
 * const capabilities = await new WMTSCapabilitiesLoader().loadAsync(
 *     'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&request=GetCapabilities'
 * );
 *
 * // Create tiles renderer with WMTS plugin
 * const tiles = new TilesRenderer();
 * tiles.registerPlugin(new WMTSTilesPlugin({
 *     capabilities,
 *     layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
 *     shape: 'ellipsoid',
 *     center: true,
 * }));
 *
 * @example
 * // Usage with custom dimensions (e.g., time)
 * tiles.registerPlugin(new WMTSTilesPlugin({
 *     capabilities,
 *     layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
 *     dimensions: {
 *         Time: '2013-06-16'
 *     }
 * }));
 */
export class WMTSImageSource extends TiledImageSource {

	/**
	 * Creates a new WMTSImageSource instance.
	 *
	 * @param {Object} [options={}] - Configuration options
	 * @param {Object} [options.capabilities=null] - Parsed WMTS capabilities object from WMTSCapabilitiesLoader
	 * @param {string|Object} [options.layer=null] - Layer identifier string or layer object. If null, uses first available layer.
	 * @param {string|Object} [options.tileMatrixSet=null] - TileMatrixSet identifier or object. If null, uses first available.
	 * @param {string} [options.style=null] - Style identifier. If null, uses the default style.
	 * @param {string} [options.url=null] - Custom URL template. If null, extracted from capabilities.
	 * @param {Object} [options.dimensions={}] - Dimension values (e.g., { Time: '2023-01-01' })
	 */
	constructor( options = {} ) {

		const {
			capabilities = null,
			layer = null,
			tileMatrixSet = null,
			style = null,
			url = null,
			dimensions = {},
			...rest
		} = options;

		super( rest );

		/**
		 * Parsed WMTS capabilities object
		 * @type {Object|null}
		 */
		this.capabilities = capabilities;

		/**
		 * The layer to render (identifier string or layer object)
		 * @type {string|Object|null}
		 */
		this.layer = layer;

		/**
		 * The tile matrix set to use (identifier string or object)
		 * @type {string|Object|null}
		 */
		this.tileMatrixSet = tileMatrixSet;

		/**
		 * The style identifier
		 * @type {string|null}
		 */
		this.style = style;

		/**
		 * Dimension values for the WMTS request
		 * @type {Object}
		 */
		this.dimensions = dimensions;

		/**
		 * The URL template for tile requests
		 * @type {string|null}
		 */
		this.url = url;

	}

	/**
	 * Generates the URL for a specific tile.
	 *
	 * @param {number} x - Tile column index
	 * @param {number} y - Tile row index
	 * @param {number} level - Zoom level (TileMatrix)
	 * @returns {string} The complete URL for the requested tile
	 */
	getUrl( x, y, level ) {

		return this.url
			.replace( /{\s*TileMatrix\s*}/gi, level )
			.replace( /{\s*TileCol\s*}/gi, x )
			.replace( /{\s*TileRow\s*}/gi, y );

	}

	/**
	 * Initializes the image source by parsing capabilities and setting up the tiling scheme.
	 *
	 * This method:
	 * - Resolves layer, tileMatrixSet, and style from capabilities
	 * - Determines the projection (EPSG:4326 or EPSG:3857)
	 * - Configures the tiling scheme with proper bounds and tile sizes
	 * - Constructs the final URL template
	 *
	 * @returns {Promise<void>} Resolves when initialization is complete
	 */
	init() {

		const { tiling, dimensions, capabilities } = this;
		let { layer, tileMatrixSet, style, url } = this;

		// extract the layer to use
		if ( ! layer ) {

			layer = capabilities.layers[ 0 ];

		} else if ( typeof layer === 'string' ) {

			layer = capabilities.layers.find( l => l.identifier === layer );

		}

		// extract the tile matrix set
		if ( ! tileMatrixSet ) {

			tileMatrixSet = layer.tileMatrixSets[ 0 ];

		} else if ( typeof tileMatrixSet === 'string' ) {

			tileMatrixSet = layer.tileMatrixSets.find( tms => tms.identifier === tileMatrixSet );

		}

		// extract the style
		if ( ! style ) {

			style = layer.styles.find( style => style.isDefault ).identifier;

		}

		// extract the url template
		if ( ! url ) {

			url = layer.resourceUrls[ 0 ].template;

		}

		// determine the projection
		const supportedCRS = tileMatrixSet.supportedCRS;
		const projection = ( supportedCRS.includes( '4326' ) || isCRS84( supportedCRS ) ) ? 'EPSG:4326' : 'EPSG:3857';

		// generate the tiling scheme
		tiling.flipY = true;
		tiling.setProjection( new ProjectionScheme( projection ) );

		if ( layer.boundingBox !== null ) {

			tiling.setContentBounds( ...layer.boundingBox.bounds );

		} else {

			tiling.setContentBounds( ...tiling.projection.getBounds() );

		}

		tileMatrixSet.tileMatrices.forEach( ( tm, i ) => {

			// TODO: needs to set tileCountX from matrix width?
			// TODO: How does bounds and tile count work together here?
			// Can one typically be generated from the other?

			const { tileWidth, tileHeight, matrixWidth, matrixHeight } = tm;
			tiling.setLevel( i, {
				tilePixelWidth: tileWidth,
				tilePixelHeight: tileHeight,
				tileCountX: matrixWidth || tiling.projection.tileCountX * 2 ** i,
				tileCountY: matrixHeight || tiling.projection.tileCountY * 2 ** i,
				tileBounds: tm.bounds,
			} );

		} );

		// construct the url
		url = url
			.replace( /{\s*TileMatrixSet\s*}/g, tileMatrixSet.identifier )
			.replace( /{\s*Style\s*}/g, style );

		// fill in the dimension values
		for ( const key in dimensions ) {

			url = url.replace( new RegExp( `{\\s*${ key }\\s*}` ), dimensions[ key ] );

		}

		layer.dimensions.forEach( dim => {

			url = url.replace( new RegExp( `{\\s*${ dim.identifier }\\s*}` ), dim.defaultValue );

		} );

		this.url = url;

		return Promise.resolve();

	}

}
