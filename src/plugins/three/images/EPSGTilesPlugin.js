
// Support for XYZ / Slippy tile systems

import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';

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
		this.tileWidth = tileDimension;
		this.tileHeight = tileDimension;
		this.levels = levels;
		this.url = null;
		this.flipY = true;

	}

	async loadRootTileSet() {

		// transform the url
		const { tiles, tileWidth, tileHeight, maxLevel } = this;
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		this.width = tileWidth * ( 2 ** maxLevel );
		this.height = tileHeight * ( 2 ** maxLevel );
		this.url = url;
		this.projection = 'mercator';

		return this.getTileset( url );

	}

	getUrl( level, x, y ) {

		return this.url.replace( '{z}', level ).replace( '{x}', x ).replace( '{y}', y );

	}

}

// Support for TMS tiles
// https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
export class TMSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'TMS_TILES_PLUGIN';
		this.flipY = false;
		this.url = null;
		this.extension = null;

	}

	loadRootTileSet() {

		const url = new URL( 'tilemapresource.xml', this.tiles.rootURL ).toString();
		return this.tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {

				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				// const boundingBox = xml.querySelector( 'BoundingBox' );
				// const origin = xml.querySelector( 'Origin' );
				const tileFormat = xml.querySelector( 'TileFormat' );
				const tileSets = xml.querySelector( 'TileSets' );
				const tileSetList = [ ...tileSets.querySelectorAll( 'TileSet' ) ]
					.map( ts => ( {
						href: parseInt( ts.getAttribute( 'href' ) ),
						unitsPerPixel: parseFloat( ts.getAttribute( 'units-per-pixel' ) ),
						order: parseInt( ts.getAttribute( 'order' ) ),
					} ) )
					.sort( ( a, b ) => {

						return a.order - b.order;

					} );

				// TODO: need to account for these values (origin and min values) when generating ellipsoid
				// TODO: might want to account for this offset when positioning the tiles? Or expose it? Could be
				// used for overlays.
				// TODO: the origin can be outside the box bounds and result in negative values for tiles. The tile coordinates
				// may need to account for this origin positioning - ie they may not start at 0, 0?
				// the extents of the tile set in lat / lon
				// const minX = parseFloat( boundingBox.getAttribute( 'minx' ) );
				// const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) );
				// const minY = parseFloat( boundingBox.getAttribute( 'miny' ) );
				// const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) );

				// origin in lat / lon
				// const x = parseFloat( origin.getAttribute( 'x' ) );
				// const y = parseFloat( origin.getAttribute( 'y' ) );

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );

				const profile = tileSets.getAttribute( 'profile' );
				const srs = xml.querySelector( 'SRS' ).textContent;

				switch ( srs ) {

					case 'EPSG:3857': // web-mercator spherical projection
					case 'EPSG:4326': // equirect projection
						break;
					default:
						throw new Error( `TMSTilesPlugin: ${ srs } SRS not supported.` );

				}

				// TODO: global-geodetic seems to require two horizontal root tiles. Is hardcoding the right way?
				let widthMultiplier = 1;
				let heightMultiplier = 1;
				switch ( profile ) {

					case 'geodetic':
					case 'global-geodetic':
						widthMultiplier = 2;
						heightMultiplier = 1;
						this.projection = 'geodetic';
						break;
					case 'mercator':
					case 'global-mercator':
						this.projection = 'mercator';
						break;
					case 'local':
					case 'none':
					default:
						throw new Error( `TMSTilesPlugin: Profile ${ profile } not supported.` );

				}

				const levels = tileSetList.length;
				const maxLevel = levels - 1;
				this.extension = extension;
				this.width = widthMultiplier * tileWidth * ( 2 ** maxLevel );
				this.height = heightMultiplier * tileHeight * ( 2 ** maxLevel );
				this.tileWidth = tileWidth;
				this.tileHeight = tileHeight;
				this.levels = levels;
				this.url = this.tiles.rootURL;
				this.tileSets = tileSetList;

				// ellipsoid projection data
				// this.minLat = minY;
				// this.maxLat = maxY;
				// this.minLon = minX;
				// this.maxLon = maxX;

				return this.getTileset( url );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ parseInt( tileSets[ level ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

	}

}
