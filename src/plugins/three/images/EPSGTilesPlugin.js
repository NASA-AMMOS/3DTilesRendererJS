
// Support for XYZ / Slippy tile systems

import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export class XYZTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( options = {} ) {

		const {
			levels = 20,
			tileDimension = 256,
			pixelSize = 1e-5,
			...rest
		} = options;

		super( { pixelSize, ...rest } );

		this.name = 'XYZ_TILES_PLUGIN';
		this.imageSource = new XYZImageSource( { levels, tileDimension } );

	}

}

// Support for TMS tiles
// https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
// NOTE: Most, if not all, TMS generation implementations do not correctly support the Origin tag
// and tile index offsets, including CesiumJS and Ion.
export class TMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'TMS_TILES_PLUGIN';
		this.imageSource = new TMSImageSource();

	}

}
