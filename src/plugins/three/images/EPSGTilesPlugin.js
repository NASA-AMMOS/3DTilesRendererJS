
// Support for XYZ / Slippy tile systems

import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';
import { MathUtils } from 'three';

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
		this.tileDimension = tileDimension;
		this.levels = levels;
		this.url = null;

	}

	async loadRootTileSet() {

		// transform the url
		const { tiles, tiling, projection, tileDimension, levels } = this;

		projection.setScheme( 'EPSG:3857' );
		tiling.flipY = true;
		tiling.setProjection( projection );
		tiling.generateLevels( levels, 1, 1, {
			tilePixelWidth: tileDimension,
			tilePixelHeight: tileDimension,
		} );

		// initialize url
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
		this.url = url;

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
		this.url = null;

	}

	loadRootTileSet() {

		const url = new URL( 'tilemapresource.xml', this.tiles.rootURL ).toString();
		return this.tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {

				const { projection, tiling } = this;

				// elements
				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				const boundingBox = xml.querySelector( 'BoundingBox' );
				const origin = xml.querySelector( 'Origin' );
				const tileFormat = xml.querySelector( 'TileFormat' );
				const tileSets = xml.querySelector( 'TileSets' ).querySelectorAll( 'TileSet' );

				// tile set definitions
				const tileSetList = [ ...tileSets ]
					.map( ts => ( {
						href: parseInt( ts.getAttribute( 'href' ) ),
						unitsPerPixel: parseFloat( ts.getAttribute( 'units-per-pixel' ) ),
						order: parseInt( ts.getAttribute( 'order' ) ),
					} ) )
					.sort( ( a, b ) => {

						return a.order - b.order;

					} );

				// bounding box
				const minX = parseFloat( boundingBox.getAttribute( 'minx' ) ) * MathUtils.DEG2RAD;
				const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) ) * MathUtils.DEG2RAD;
				const minY = parseFloat( boundingBox.getAttribute( 'miny' ) ) * MathUtils.DEG2RAD;
				const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) ) * MathUtils.DEG2RAD;

				// origin in lat / lon
				const originX = parseFloat( origin.getAttribute( 'x' ) );
				const originY = parseFloat( origin.getAttribute( 'y' ) );

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );
				const srs = xml.querySelector( 'SRS' ).textContent;

				// assign settings
				this.extension = extension;
				this.url = this.tiles.rootURL;
				this.tileSets = tileSetList;

				// initialize tiling and projection schemes
				projection.setScheme( srs );

				tiling.setProjection( projection );
				tiling.setOrigin( originX, originY );
				tiling.setBounds( minX, minY, maxX, maxY );

				tileSetList.forEach( ( { order } ) => {

					tiling.setLevel( order, {
						tileCountX: projection.tileCountX * 2 ** order,
						tilePixelWidth: tileWidth,
						tilePixelHeight: tileHeight,
					} );

				} );

				return this.getTileset( url );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ parseInt( tileSets[ level ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

	}

}
