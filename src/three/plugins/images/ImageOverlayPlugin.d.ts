import { Color, Matrix4, WebGLRenderer } from 'three';
import { WMTSCapabilitiesResult, WMTSLayer, WMTSTileMatrixSet } from '../loaders/WMTSCapabilitiesLoader.js';

/**
 * Plugin for rendering image overlays on top of 3D Tiles.
 *
 * Supports multiple overlay types including XYZ tiles, WMS, WMTS, TMS,
 * GeoJSON, and Cesium Ion imagery.
 *
 * @example
 * ```js
 * import { TilesRenderer } from '3d-tiles-renderer';
 * import { ImageOverlayPlugin, XYZTilesOverlay } from '3d-tiles-renderer/plugins';
 *
 * const overlay = new XYZTilesOverlay({
 *   url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
 *   levels: 20,
 *   dimension: 256,
 *   projection: 'EPSG:3857',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 *
 * const plugin = new ImageOverlayPlugin({
 *   overlays: [overlay],
 *   renderer: webglRenderer
 * });
 *
 * tilesRenderer.registerPlugin(plugin);
 * ```
 *
 * @category Plugins
 */
export class ImageOverlayPlugin {

	/**
	 * Creates a new ImageOverlayPlugin.
	 *
	 * @param options - Plugin configuration options
	 * @param options.overlays - Array of image overlays to render
	 * @param options.renderer - WebGL renderer for texture operations
	 * @param options.resolution - Texture resolution multiplier
	 * @param options.enableTileSplitting - Enable splitting tiles for better overlay alignment
	 * @param options.alphaMask - If true, use alpha channel as mask; if false, fade to layer below
	 * @param options.alphaInvert - If true, cut outside (keep inside); if false, cut inside (keep outside)
	 */
	constructor( options: {
		overlays: Array<ImageOverlay>,
		renderer: WebGLRenderer,
		resolution?: number,
		enableTileSplitting?: boolean,
		alphaMask?: boolean,
		alphaInvert?: boolean,
	} );

	/**
	 * Adds an overlay to the plugin.
	 *
	 * @param overlay - The overlay to add
	 * @param order - Optional z-order for the overlay (higher = on top)
	 */
	addOverlay( overlay: ImageOverlay, order?: number ): void;

	/**
	 * Changes the z-order of an existing overlay.
	 *
	 * @param overlay - The overlay to reorder
	 * @param order - New z-order value
	 */
	setOverlayOrder( overlay: ImageOverlay, order?: number ): void;

	/**
	 * Removes an overlay from the plugin.
	 *
	 * @param overlay - The overlay to remove
	 */
	deleteOverlay( overlay: ImageOverlay ): void;

}

/**
 * Base class for image overlays.
 *
 * Provides common properties for all overlay types including color,
 * opacity, and coordinate frame transformation.
 *
 * @category Plugins
 */
export class ImageOverlay {

	/**
	 * Tint color applied to the overlay.
	 * @defaultValue 0xffffff (white, no tint)
	 */
	color: number | Color;

	/**
	 * Opacity of the overlay (0 = transparent, 1 = opaque).
	 * @defaultValue 1.0
	 */
	opacity: number;

	/**
	 * Transformation matrix for the overlay coordinate frame.
	 * Set to null to use the default globe frame.
	 */
	frame: Matrix4 | null;

	/**
	 * Options passed to fetch() when loading tiles.
	 */
	fetchOptions: any;

	/**
	 * Function to preprocess tile URLs before fetching.
	 * Return null to skip loading the tile.
	 */
	preprocessURL: ( url: string ) => string | null;

}

/**
 * Overlay for XYZ tile services (slippy map tiles).
 *
 * Supports standard web map tile services like OpenStreetMap, Mapbox, etc.
 *
 * @example
 * ```js
 * const overlay = new XYZTilesOverlay({
 *   url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
 *   levels: 19,
 *   dimension: 256,
 *   projection: 'EPSG:3857',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @category Plugins
 */
export class XYZTilesOverlay extends ImageOverlay {

	/**
	 * Creates a new XYZ tiles overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.levels - Maximum zoom level
	 * @param options.dimension - Tile size in pixels (typically 256 or 512)
	 * @param options.projection - Coordinate projection (e.g., 'EPSG:3857', 'EPSG:4326')
	 * @param options.url - Tile URL template with {z}, {x}, {y} placeholders
	 * @param options.color - Tint color
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 * @param options.preprocessURL - Optional URL preprocessing function
	 */
	constructor( options: {
		levels: number,
		dimension: number,
		projection: string;
		url: string,
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

/**
 * Overlay for rendering GeoJSON data as rasterized tiles.
 *
 * Converts GeoJSON features to image tiles on-the-fly for efficient
 * rendering on large-scale 3D terrain.
 *
 * @example
 * ```js
 * const overlay = new GeoJSONOverlay({
 *   url: 'https://example.com/data.geojson',
 *   levels: 15,
 *   tileDimension: 256,
 *   strokeStyle: '#ff0000',
 *   strokeWidth: 2,
 *   fillStyle: 'rgba(255, 0, 0, 0.3)',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @example With inline GeoJSON
 * ```js
 * const geojson = {
 *   type: 'FeatureCollection',
 *   features: [{
 *     type: 'Feature',
 *     geometry: { type: 'Point', coordinates: [-122.4, 37.8] },
 *     properties: {}
 *   }]
 * };
 *
 * const overlay = new GeoJSONOverlay({
 *   geojson,
 *   pointRadius: 5,
 *   fillStyle: 'blue'
 * });
 * ```
 *
 * @category Plugins
 */
export class GeoJSONOverlay extends ImageOverlay {

	/**
	 * Creates a new GeoJSON overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.geojson - GeoJSON FeatureCollection object (alternative to url)
	 * @param options.url - URL to fetch GeoJSON from (alternative to geojson)
	 * @param options.tileDimension - Tile size in pixels for rasterization
	 * @param options.levels - Maximum zoom level for rasterization
	 * @param options.pointRadius - Radius for point features in pixels
	 * @param options.strokeStyle - CSS stroke color for lines and polygon outlines
	 * @param options.strokeWidth - Stroke width in pixels
	 * @param options.fillStyle - CSS fill color for polygons and points
	 * @param options.color - Tint color applied to rendered tiles
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 */
	constructor( options: {
		geojson?: any,
		url?: string,
		tileDimension?: number,
		levels?: number,
		pointRadius?: number,
		strokeStyle?: string,
		strokeWidth?: number,
		fillStyle?: string,
		color?: number | Color,
		opacity?: number,
		frame?: Matrix4 | null,
	} );

}

/**
 * Overlay for WMS (Web Map Service) tile services.
 *
 * Supports OGC WMS 1.1.1 and 1.3.0 protocols.
 *
 * @example
 * ```js
 * const overlay = new WMSTilesOverlay({
 *   url: 'https://example.com/wms',
 *   layer: 'my-layer',
 *   crs: 'EPSG:4326',
 *   format: 'image/png',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @category Plugins
 */
export class WMSTilesOverlay extends ImageOverlay {

	/**
	 * Creates a new WMS tiles overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.url - WMS service base URL
	 * @param options.layer - Layer name to request
	 * @param options.crs - Coordinate reference system (default: 'EPSG:4326')
	 * @param options.format - Image format (default: 'image/png')
	 * @param options.tileDimension - Tile size in pixels
	 * @param options.styles - WMS styles parameter
	 * @param options.version - WMS version (default: '1.1.1')
	 * @param options.levels - Maximum zoom level
	 * @param options.transparent - Request transparent tiles
	 * @param options.contentBoundingBox - Bounding box [minX, minY, maxX, maxY]
	 * @param options.color - Tint color
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 * @param options.preprocessURL - Optional URL preprocessing function
	 */
	constructor( options: {
		url: string,
		layer: string,
		crs?: string,
		format?: string,
		tileDimension?: number,
		styles?: string,
		version?: string,
		levels?: number,
		transparent?: boolean,
		contentBoundingBox?: [number, number, number, number],
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

/**
 * Overlay for WMTS (Web Map Tile Service) tile services.
 *
 * Supports OGC WMTS 1.0.0 protocol with capabilities auto-discovery.
 *
 * @example
 * ```js
 * const overlay = new WMTSTilesOverlay({
 *   url: 'https://example.com/wmts/1.0.0/WMTSCapabilities.xml',
 *   layer: 'my-layer',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @category Plugins
 */
export class WMTSTilesOverlay extends ImageOverlay {

	/**
	 * Creates a new WMTS tiles overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.dimensions - Additional dimension parameters
	 * @param options.url - WMTS capabilities URL
	 * @param options.capabilities - Pre-loaded capabilities object (alternative to url)
	 * @param options.layer - Layer object or name
	 * @param options.tileMatrixSet - Tile matrix set object or name
	 * @param options.style - Style identifier
	 * @param options.color - Tint color
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 * @param options.preprocessURL - Optional URL preprocessing function
	 */
	constructor( options: {
		dimensions?: { [key: string]: any } | null,
		url?: string | null,
		capabilities?: WMTSCapabilitiesResult | null,
		layer?: WMTSLayer | string | null,
		tileMatrixSet?: WMTSTileMatrixSet | string | null,
		style?: string,
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

/**
 * Overlay for TMS (Tile Map Service) tile services.
 *
 * @example
 * ```js
 * const overlay = new TMSTilesOverlay({
 *   url: 'https://example.com/tms/1.0.0/layer',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @category Plugins
 */
export class TMSTilesOverlay extends ImageOverlay {

	/**
	 * Creates a new TMS tiles overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.url - TMS service base URL
	 * @param options.color - Tint color
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 * @param options.preprocessURL - Optional URL preprocessing function
	 */
	constructor( options: {
		url: string,
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

/**
 * Overlay for Cesium Ion imagery assets.
 *
 * Automatically handles Cesium Ion authentication and token refresh.
 *
 * @example
 * ```js
 * const overlay = new CesiumIonOverlay({
 *   assetId: 3954,
 *   apiToken: 'your-cesium-ion-token',
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @category Plugins
 */
export class CesiumIonOverlay extends ImageOverlay {

	/**
	 * Creates a new Cesium Ion imagery overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.assetId - Cesium Ion asset ID
	 * @param options.apiToken - Cesium Ion API access token
	 * @param options.autoRefreshToken - Automatically refresh expired tokens
	 * @param options.color - Tint color
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 * @param options.preprocessURL - Optional URL preprocessing function
	 */
	constructor( options: {
		assetId: number | string,
		apiToken: string,
		autoRefreshToken?: boolean,
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}

/**
 * Overlay for Google Maps tile imagery.
 *
 * Supports various Google Maps tile types including satellite, roadmap, and terrain.
 *
 * @example
 * ```js
 * const overlay = new GoogleMapsOverlay({
 *   apiToken: 'your-google-maps-api-key',
 *   sessionOptions: {
 *     mapType: 'satellite',
 *     language: 'en',
 *     region: 'US'
 *   },
 *   color: 0xffffff,
 *   opacity: 1.0
 * });
 * ```
 *
 * @category Plugins
 */
export class GoogleMapsOverlay extends ImageOverlay {

	/**
	 * Creates a new Google Maps imagery overlay.
	 *
	 * @param options - Overlay configuration
	 * @param options.apiToken - Google Maps API key
	 * @param options.autoRefreshToken - Automatically refresh expired session tokens
	 * @param options.logoUrl - Custom logo URL for attribution
	 * @param options.sessionOptions - Google Maps session options
	 * @param options.sessionOptions.mapType - Map type ('satellite', 'roadmap', 'terrain', 'hybrid')
	 * @param options.sessionOptions.language - Language code (e.g., 'en', 'zh')
	 * @param options.sessionOptions.region - Region code (e.g., 'US', 'CN')
	 * @param options.color - Tint color
	 * @param options.opacity - Opacity (0-1)
	 * @param options.frame - Optional coordinate frame transformation
	 * @param options.preprocessURL - Optional URL preprocessing function
	 */
	constructor( options: {
		apiToken: string,
		autoRefreshToken?: boolean,
		logoUrl?: string,
		sessionOptions: { mapType: string, language: string, region: string, [key: string]: any },
		color: number | Color,
		opacity: number,
		frame?: Matrix4 | null,
		preprocessURL?: ( url: string ) => string | null;
	} );

}
