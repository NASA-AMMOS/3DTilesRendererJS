
// Support for XYZ / Slippy tile systems

import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { WMTSImageSource } from './sources/WMTSImageSource.js';
import { WMSImageSource } from './sources/WMSImageSource.js';

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
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

// Support for TMS tiles
// https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
// NOTE: Most, if not all, TMS generation implementations do not correctly support the Origin tag
// and tile index offsets, including CesiumJS and Ion.
export class TMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const { url, ...rest } = options;
		super( rest );

		this.name = 'TMS_TILES_PLUGIN';
		this.imageSource = new TMSImageSource( { url } );

	}

}

// Support for WMTS tiles via a url template
export class WMTSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			capabilities,
			layer,
			tileMatrixSet,
			style,
			dimensions,
			...rest
		} = options;

		super( rest );

		this.name = 'WTMS_TILES_PLUGIN';
		this.imageSource = new WMTSImageSource( {
			capabilities,
			layer,
			tileMatrixSet,
			style,
			dimensions
		} );

	}

}

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
