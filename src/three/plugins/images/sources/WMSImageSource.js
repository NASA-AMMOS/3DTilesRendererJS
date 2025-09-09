import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { MathUtils } from 'three';

export class WMSImageSource extends TiledImageSource {

	// TODO: layer and styles can be arrays, comma separated lists
	constructor( options = {} ) {

		const {
			url = null,
			layer = null,
			styles = null,
			contentBoundingBox = null,
			version = '1.3.0',
			crs = 'EPSG:4326',
			format = 'image/png',
			levels = 18,
			tileDimension = 256,
			extraHeaders = {},
		} = options;

		super();
		this.url = url;
		this.layer = layer;
		this.crs = crs;
		this.format = format;
		this.tileDimension = tileDimension;
		this.styles = styles;
		this.version = version;
		this.levels = levels;
		this.contentBoundingBox = contentBoundingBox;
		this.extraHeaders = extraHeaders;

	}

	init() {

		const { tiling, levels, tileDimension, contentBoundingBox } = this;
		tiling.setProjection( new ProjectionScheme( this.crs ) );
		tiling.flipY = true;
		tiling.generateLevels( levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
		} );

		if ( contentBoundingBox !== null ) {

			tiling.setContentBounds( ...contentBoundingBox );

		} else {

			tiling.setContentBounds( ...tiling.projection.getBounds() );

		}

		return Promise.resolve();

	}

	async fetchData( url ) {

		// TODO: remove this
		const response = await fetch( url, { headers: this.extraHeaders } );
		if ( ! response.ok ) throw new Error( 'WMS fetch failed' );
		return await response.blob();

	}

	// TODO: handle this in ProjectionScheme or TilingScheme? Or Loader?
	normalizedToMercatorX( v ) {

		const MERCATOR_MIN = - 20037508.342789244;
		const MERCATOR_MAX = 20037508.342789244;
		return MathUtils.mapLinear( v, 0, 1, MERCATOR_MIN, MERCATOR_MAX );

	}

	normalizedToMercatorY( v ) {

		const MERCATOR_MIN = - 20037508.342789244;
		const MERCATOR_MAX = 20037508.342789244;
		return MathUtils.mapLinear( v, 0, 1, MERCATOR_MIN, MERCATOR_MAX );

	}

	getUrl( x, y, level ) {

		const {
			tiling,
			layer,
			crs,
			format,
			tileDimension,
			styles,
			version,
		} = this;


		// Axis order and CRS param name depend on WMS version and CRS
		// crsParam: 'SRS' for WMS 1.1.1, 'CRS' for WMS 1.3.0
		const crsParam = version === '1.1.1' ? 'SRS' : 'CRS';
		let bboxParam;

		if ( crs === 'EPSG:3857' ) {

			// Always lon / lat order for both versions
			const range = tiling.getTileBounds( x, y, level, true, false );
			const minx = this.normalizedToMercatorX( range[ 0 ] );
			const miny = this.normalizedToMercatorY( range[ 1 ] );
			const maxx = this.normalizedToMercatorX( range[ 2 ] );
			const maxy = this.normalizedToMercatorY( range[ 3 ] );
			bboxParam = [ minx, miny, maxx, maxy ];

		} else {

			// Get the tile bounds as degrees
			const [ minx, miny, maxx, maxy ] = tiling
				.getTileBounds( x, y, level, false, false )
				.map( v => v * MathUtils.RAD2DEG );

			if ( crs === 'EPSG:4326' ) {

				// Note: In WMS 1.1.1 EPSG:4326 is wrongly defined as having long/lat coordinate axes. See v1.3.0 documentation for details.
				// Docs:  https://docs.foursquare.com/analytics-products/docs/data-formats-wms
				// Topic: https://gis.stackexchange.com/questions/23347/getmap-wms-1-1-1-vs-1-3-0
				if ( version === '1.1.1' ) {

					// WMS 1.1.1: lon / lat order
					bboxParam = [ minx, miny, maxx, maxy ];

				} else {

					// WMS 1.3.0: lat / lon order
					bboxParam = [ miny, minx, maxy, maxx ];

				}

			} else {

				bboxParam = [ minx, miny, maxx, maxy ];

			}

		}

		const params = new URLSearchParams( {
			SERVICE: 'WMS',
			REQUEST: 'GetMap',
			VERSION: version,
			LAYERS: layer,
			STYLES: styles,
			[ crsParam ]: crs,
			BBOX: bboxParam.join( ',' ),
			WIDTH: tileDimension,
			HEIGHT: tileDimension,
			FORMAT: format,
			TRANSPARENT: 'TRUE',
		} );

		return new URL( '?' + params.toString(), this.url ).toString();

	}

}
