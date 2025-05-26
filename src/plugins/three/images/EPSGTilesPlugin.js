
// Support for XYZ / Slippy tile systems

import { EllipsoidProjectionTilesPlugin } from './EllipsoidProjectionTilesPlugin.js';

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export class XYZTilesPlugin extends EllipsoidProjectionTilesPlugin {

	get tileDimension() {

		return this.tiling.tilePixelWidth;

	}

	set tileDimension( value ) {

		this.tiling.tilePixelWidth = value;
		this.tiling.tilePixelHeight = value;

	}

	get levels() {

		return this.tiling.levels;

	}

	set levels( value ) {

		this.tiling.levels = value;

	}

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
		this.flipY = true;

	}

	async loadRootTileSet() {

		// transform the url
		const { tiles, tiling, projection } = this;
		const { tilePixelWidth, tilePixelHeight, levels } = tiling;

		// initialize tiling & projection scheme
		const maxLevel = levels - 1;
		tiling.pixelWidth = tilePixelWidth * ( 2 ** maxLevel );
		tiling.pixelHeight = tilePixelHeight * ( 2 ** maxLevel );

		projection.setScheme( 'EPSG:3857' );

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
				const minX = parseFloat( boundingBox.getAttribute( 'minx' ) );
				const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) );
				const minY = parseFloat( boundingBox.getAttribute( 'miny' ) );
				const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) );

				// origin in lat / lon
				const originX = parseFloat( origin.getAttribute( 'x' ) );
				const originY = parseFloat( origin.getAttribute( 'y' ) );

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );
				const srs = xml.querySelector( 'SRS' ).textContent;

				const levels = tileSetList.length;
				const maxLevel = levels - 1;

				// assign settings
				this.extension = extension;
				this.url = this.tiles.rootURL;
				this.tileSets = tileSetList;

				// initialize tiling and projection schemes
				projection.setScheme( srs );

				tiling.levels = levels;
				tiling.tileCountX = projection.tileCountX;
				tiling.tileCountY = projection.tileCountY;
				tiling.pixelWidth = projection.tileCountX * tileWidth * ( 2 ** maxLevel );
				tiling.pixelHeight = projection.tileCountY * tileHeight * ( 2 ** maxLevel );
				tiling.tilePixelWidth = tileWidth;
				tiling.tilePixelHeight = tileHeight;
				tiling.setOrigin( originX, originY );
				tiling.setBounds( minX, minY, maxX, maxY );

				return this.getTileset( url );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ parseInt( tileSets[ level ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

	}

}

// Support for WMTS tiles
// https://www.ogc.org/standards/wmts/
export class WMTSTilesPlugin extends EllipsoidProjectionTilesPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'WMTS_TILES_PLUGIN';
		this.flipY = false;
		this.url = null;
		this.extension = null;

	}

	loadRootTileSet() {

		const url = new URL( 'WMTSCapabilities.xml', this.tiles.rootURL ).toString();
		return this.tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {


				const { projection, tiling } = this;

				// elements
				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				const contents = xml.querySelector( 'Contents' );

				const layers = [ ...contents.querySelectorAll( 'Layer' ) ]
					.map( layer => {

						const links = [ ...layer.querySelectorAll( 'TileMatrixSet' ) ].map( tms => tms.textContent );
						const formats = [ ...layer.querySelectorAll( 'Format' ) ].map( f => f.textContent );
						// const wgs84 = layer.getElementsByTagName( 'ows:WGS84BoundingBox' )[ 0 ];
						// const lowerBound = wgs84.getElementsByTagName( 'ows:LowerCorner' )[ 0 ];
						// const upperBound = wgs84.getElementsByTagName( 'ows:UpperCorner' )[ 0 ];
						// const bounds = [
						// 	...lowerBound.textContent.trim().split( /\s+/ ).map( v => parseFloat( v ) ),
						// 	...upperBound.textContent.trim().split( /\s+/ ).map( v => parseFloat( v ) ),
						// ];

						// TODO: flat bounding box?

						return {
							links,
							formats,
						};

					} );

				const matrixSets = [ ...contents.childNodes ]
					.filter( node => {

						return node.nodeName === 'TileMatrixSet';

					} )
					.map( matrixSet => {

						const identifier = matrixSet.getElementsByTagName( 'ows:Identifier' )[ 0 ];
						const supportedCrs = matrixSet.getElementsByTagName( 'ows:SupportedCRS' )[ 0 ];
						const boundingBox = matrixSet.getElementsByTagName( 'ows:BoundingBox' )[ 0 ];
						const lowerBound = boundingBox.getElementsByTagName( 'ows:LowerCorner' )[ 0 ];
						const upperBound = boundingBox.getElementsByTagName( 'ows:UpperCorner' )[ 0 ];
						const bounds = [
							...lowerBound.textContent.trim().split( /\s+/ ).map( v => parseFloat( v ) ),
							...upperBound.textContent.trim().split( /\s+/ ).map( v => parseFloat( v ) ),
						];

						const levels = [ ...matrixSet.querySelectorAll( 'TileMatrix' ) ]
							.map( ms => {

								return {
									identifier: ms.getElementsByTagName( 'ows:Identifier' )[ 0 ].textContent,
									tileWidth: parseInt( ms.querySelector( 'TileWidth' ).textContent ),
									tileHeight: parseInt( ms.querySelector( 'TileHeight' ).textContent ),
									matrixWidth: parseInt( ms.querySelector( 'MatrixWidth' ).textContent ),
									matrixHeight: parseInt( ms.querySelector( 'MatrixHeight' ).textContent ),
								};

							} );

						// TODO: flat bounding box?
						return {
							name: identifier.textContent,
							supportedCrs: supportedCrs.textContent.replace( /.+?EPSG::/, 'EPSG:' ),
							levels,
							bounds,
						};

					} );


				const layer = layers[ 0 ];

				this.format = layer.formats[ 0 ].replace( /.+\//, '' );

				const matrixSet = matrixSets[ 0 ];
				const levels = matrixSet.levels.length;
				const maxLevel = levels - 1;
				const { tileWidth, tileHeight } = matrixSet.levels[ 0 ];

				projection.setScheme( matrixSet.supportedCrs );

				tiling.levels = matrixSet.levels.length;
				tiling.tileCountX = projection.tileCountX;
				tiling.tileCountY = projection.tileCountY;
				tiling.pixelWidth = projection.tileCountX * tileWidth * ( 2 ** maxLevel );
				tiling.pixelHeight = projection.tileCountY * tileHeight * ( 2 ** maxLevel );
				tiling.tilePixelWidth = tileWidth;
				tiling.tilePixelHeight = tileHeight;
				tiling.setOrigin( 0, 0 );
				tiling.setBounds( ...matrixSet.bounds );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ parseInt( tileSets[ level ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

	}

}
