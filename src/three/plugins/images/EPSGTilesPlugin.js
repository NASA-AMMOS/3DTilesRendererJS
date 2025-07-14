
// Support for XYZ / Slippy tile systems

import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { WMTSImageSource } from './sources/WMTSImageSource.js';

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export class XYZTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			pixelSize = 1e-5,
			levels,
			tileDimension,
			projection,
			bounds,
			...rest
		} = options;

		super( { pixelSize, ...rest } );

		this.name = 'XYZ_TILES_PLUGIN';
		this.imageSource = new XYZImageSource( { levels, tileDimension, projection, bounds } );

	}

}

// Support for TMS tiles
// https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
// NOTE: Most, if not all, TMS generation implementations do not correctly support the Origin tag
// and tile index offsets, including CesiumJS and Ion.
export class TMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options ) {

		super( options );

		this.name = 'TMS_TILES_PLUGIN';
		this.imageSource = new TMSImageSource();

	}

}

// Support for WMTS tiles via a url template
export class WMTSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		// TODO: support WMTS capabilities request xml
		const {
			pixelSize = 1e-5,
			levels,
			tileDimension,
			projection,
			bounds,
			...rest
		} = options;

		super( { pixelSize, ...rest } );

		this.name = 'WTMS_TILES_PLUGIN';
		this.imageSource = new WMTSImageSource( { levels, tileDimension, projection, bounds } );

	}

}
