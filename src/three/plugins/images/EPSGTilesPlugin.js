
/** @import { WMTSTileMatrix } from './sources/WMTSImageSource.js' */
import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { WMTSImageSource } from './sources/WMTSImageSource.js';
import { WMSImageSource } from './sources/WMSImageSource.js';

/**
 * Plugin that renders XYZ/Slippy-map image tiles (e.g. OpenStreetMap) projected onto
 * 3D tile geometry. See the {@link https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames Slippy map tilenames specification}.
 * @extends EllipsoidProjectionTilesPlugin
 * @param {Object} [options]
 * @param {string} [options.url] URL template with `{x}`, `{y}`, `{z}` placeholders.
 * @param {number} [options.levels] Number of zoom levels.
 * @param {number} [options.tileDimension] Tile pixel size (defaults to 256).
 * @param {string} [options.projection] Projection scheme identifier.
 */
export class XYZTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			levels,
			tileDimension,
			projection,
			url,
			...rest
		} = options;

		super( rest );

		this.name = 'XYZ_TILES_PLUGIN';
		this.imageSource = new XYZImageSource( { url, levels, tileDimension, projection } );

	}

}

/**
 * Plugin that renders TMS (Tile Map Service) image tiles projected onto 3D tile geometry.
 * See the {@link https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification TMS specification}.
 * @extends EllipsoidProjectionTilesPlugin
 * @param {Object} [options]
 * @param {string} [options.url] URL to the TMS `tilemapresource.xml` descriptor or tile template.
 * @note Most TMS generation implementations (including CesiumJS and Ion) do not correctly support the Origin tag and tile index offsets.
 */
export class TMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const { url, ...rest } = options;
		super( rest );

		this.name = 'TMS_TILES_PLUGIN';
		this.imageSource = new TMSImageSource( { url } );

	}

}

/**
 * Plugin that renders WMTS (Web Map Tile Service) image tiles projected onto 3D tile
 * geometry. Pass a parsed capabilities object from `WMTSCapabilitiesLoader` or provide
 * a URL template directly.
 * @extends EllipsoidProjectionTilesPlugin
 * @param {Object} [options]
 * @param {string} [options.url] - WMTS service URL.
 * @param {string} [options.layer] - WMTS layer identifier.
 * @param {string} [options.tileMatrixSet] - TileMatrixSet identifier (e.g., 'GoogleMapsCompatible', 'EPSG:3857').
 * @param {string} [options.style='default'] - Style identifier.
 * @param {string} [options.format='image/jpeg'] - Output image format (e.g., 'image/png', 'image/jpeg').
 * @param {Object<string, string|number>|null} [options.dimensions=null] - WMTS dimension values
 * @param {string[]|null} [options.tileMatrixLabels=null] - Custom TileMatrix identifiers per level
 * @param {WMTSTileMatrix[]|null} [options.tileMatrices=null] - Explicit per-level tile matrix definitions. When provided, `levels` and `tileMatrixLabels` are ignored.
 * @param {string|null} [options.projection=null] - Projection identifier ('EPSG:3857' or 'EPSG:4326'). Defaults to 'EPSG:3857' if not specified.
 * @param {number} [options.levels=20] - Number of zoom levels. Ignored if `tileMatrices` is provided.
 * @param {number} [options.tileDimension=256] - Default tile width and height in pixels.
 * @param {number[]|null} [options.contentBoundingBox=null] - Content bounding box in radians, `[west, south, east, north]`. If null, uses full projection bounds.
 */
export class WMTSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			capabilities,
			url,
			layer,
			tileMatrixSet,
			style,
			format,
			dimensions,
			tileMatrixLabels,
			tileMatrices,
			projection,
			levels,
			tileDimension,
			contentBoundingBox,
			...rest
		} = options;

		super( rest );

		this.name = 'WTMS_TILES_PLUGIN';
		this.imageSource = new WMTSImageSource( {
			capabilities,
			url,
			layer,
			tileMatrixSet,
			style,
			format,
			dimensions,
			tileMatrixLabels,
			tileMatrices,
			projection,
			levels,
			tileDimension,
			contentBoundingBox,
		} );

	}

}

/**
 * Plugin that renders WMS (Web Map Service) image tiles projected onto 3D tile geometry.
 * @extends EllipsoidProjectionTilesPlugin
 * @param {Object} [options]
 * @param {string} [options.url] WMS base URL.
 * @param {string} [options.layer] WMS layer name.
 * @param {string} [options.crs] Coordinate reference system, e.g. `'EPSG:4326'`.
 * @param {string} [options.format] Image MIME type, e.g. `'image/png'`.
 * @param {number} [options.tileDimension] Tile pixel size (defaults to 256).
 * @param {string} [options.styles] WMS styles parameter.
 * @param {string} [options.version] WMS version string, e.g. `'1.3.0'`.
 */
export class WMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			url,
			layer,
			crs,
			format,
			tileDimension,
			styles,
			version,
			...rest
		} = options;

		super( rest );

		this.name = 'WMS_TILES_PLUGIN';
		this.imageSource = new WMSImageSource( {
			url,
			layer,
			crs,
			format,
			tileDimension,
			styles,
			version
		} );

	}

}
