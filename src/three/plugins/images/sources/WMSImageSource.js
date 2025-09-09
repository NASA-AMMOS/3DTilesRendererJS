import { TiledImageSource } from './TiledImageSource.js';
import { ProjectionScheme } from '../utils/ProjectionScheme.js';
import { MathUtils } from 'three';

export class WMSImageSource extends TiledImageSource {

	constructor( {
		url,
		layer,
		crs = 'EPSG:3857',
		format = 'image/png',
		tileDimension = 256,
		styles = '',
		version = '1.3.0',
		levels = 18,
		extraHeaders = {},
	} ) {

		super();
		this.url = url;
		this.layer = layer;
		this.crs = crs;
		this.format = format;
		this.tileDimension = tileDimension;
		this.styles = styles;
		this.version = version;
		this.levels = levels;
		this.extraHeaders = extraHeaders;

	}

	init() {

		const { tiling } = this;
		tiling.setProjection( new ProjectionScheme( this.crs ) );
		tiling.flipY = true;
		tiling.setContentBounds( ...tiling.projection.getBounds() );
		tiling.generateLevels( this.levels, tiling.projection.tileCountX, tiling.projection.tileCountY, {
			tilePixelWidth: this.tileDimension,
			tilePixelHeight: this.tileDimension,
		} );

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

	convertProjectionToLatitude( v ) {

		return MathUtils.mapLinear( v, 0, 1, - 90, 90 );

	}

	convertProjectionToLongitude( v ) {

		return MathUtils.mapLinear( v, 0, 1, - 180, 180 );

	}

	getUrl( x, y, level ) {

		const bbox = this.tiling.getTileBounds( x, y, level, true, false );

		// Axis order and CRS param name depend on WMS version and CRS
		// crsParam: 'SRS' for WMS 1.1.1, 'CRS' for WMS 1.3.0
		const crsParam = this.version === '1.1.1' ? 'SRS' : 'CRS';
		let bboxParam;

		if ( this.crs === 'EPSG:3857' ) {

			// Always x/y order for both versions
			const minx = this.normalizedToMercatorX( bbox[ 0 ] );
			const miny = this.normalizedToMercatorY( bbox[ 1 ] );
			const maxx = this.normalizedToMercatorX( bbox[ 2 ] );
			const maxy = this.normalizedToMercatorY( bbox[ 3 ] );
			bboxParam = [ minx, miny, maxx, maxy ];

		} else if ( this.crs === 'EPSG:4326' ) {

			const minx = this.convertProjectionToLongitude( bbox[ 0 ] );
			const miny = this.convertProjectionToLatitude( bbox[ 1 ] );
			const maxx = this.convertProjectionToLongitude( bbox[ 2 ] );
			const maxy = this.convertProjectionToLatitude( bbox[ 3 ] );

			// Note: In WMS 1.1.1 EPSG:4326 is wrongly defined as having long/lat coordinate axes. See v1.3.0 documentation for details.
			// Docs:  https://docs.foursquare.com/analytics-products/docs/data-formats-wms
			// Topic: https://gis.stackexchange.com/questions/23347/getmap-wms-1-1-1-vs-1-3-0
			if ( this.version === '1.1.1' ) {

				// WMS 1.1.1: lon / lat order
				bboxParam = [ minx, miny, maxx, maxy ];

			} else {

				// WMS 1.3.0: lat / lon order
				bboxParam = [ miny, minx, maxy, maxx ];

			}

		} else {

			bboxParam = bbox;

		}

		const params = new URLSearchParams( {
			SERVICE: 'WMS',
			REQUEST: 'GetMap',
			VERSION: this.version,
			LAYERS: this.layer,
			STYLES: this.styles,
			[ crsParam ]: this.crs,
			BBOX: bboxParam.join( ',' ),
			WIDTH: this.tileDimension,
			HEIGHT: this.tileDimension,
			FORMAT: this.format,
			TRANSPARENT: 'TRUE',
		} );

		return new URL( '?' + params.toString(), this.url ).toString();

	}

}
