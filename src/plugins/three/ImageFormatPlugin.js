import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

// Base class for supporting tiled images with a consistent size / resolution per tile
class ImageFormatPlugin {

	get maxLevel() {

		return this.levels - 1;

	}

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			center = false,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		// tile dimensions in pixels
		this.tileWidth = null;
		this.tileHeight = null;

		// full image dimensions in pixels
		this.width = null;
		this.height = null;
		this.levels = null;

		// amount of pixel overlap between tiles
		this.overlap = 0;
		this.pixelSize = pixelSize;
		this.center = center;
		this.flipY = false;

	}

	init( tiles ) {

		this.tiles = tiles;

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		// Construct texture
		const blob = new Blob( [ buffer ] );
		const imageBitmap = await createImageBitmap( blob, {
			premultiplyAlpha: 'none',
			colorSpaceConversion: 'none',
			imageOrientation: 'flipY',
		} );
		const texture = new Texture( imageBitmap );
		texture.generateMipmaps = false;
		texture.colorSpace = SRGBColorSpace;
		texture.needsUpdate = true;

		// Construct mesh
		const boundingBox = tile.boundingVolume.box;
		const [ x, y, z ] = boundingBox;
		const sx = boundingBox[ 3 ];
		const sy = boundingBox[ 7 ];
		const mesh = new Mesh( new PlaneGeometry( 2 * sx, 2 * sy ), new MeshBasicMaterial( { map: texture } ) );
		mesh.position.set( x, y, z );

		return mesh;

	}

	preprocessNode( tile, dir, parentTile ) {

		// generate children
		const { maxLevel } = this;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		if ( level < maxLevel ) {

			for ( let cx = 0; cx < 2; cx ++ ) {

				for ( let cy = 0; cy < 2; cy ++ ) {

					const child = this.expand( level + 1, 2 * x + cx, 2 * y + cy );
					if ( child ) {

						tile.children.push( child );

					}

				}

			}

		}

	}

	getTileset( baseUrl ) {

		const tileset = {
			asset: {
				version: '1.1'
			},
			geometricError: 1e5,
			root: {
				refine: 'REPLACE',
				geometricError: 1e5,
				boundingVolume: {},
				children: [],
			}
		};

		const { maxLevel, width, height, tileWidth, tileHeight } = this;
		const levelFactor = 2 ** - maxLevel;
		const tilesX = Math.ceil( levelFactor * width / tileWidth );
		const tilesY = Math.ceil( levelFactor * height / tileHeight );

		// generate all children for the root and construct a merged bounding box
		let minX = Infinity;
		let maxX = - Infinity;
		let minY = Infinity;
		let maxY = - Infinity;
		for ( let x = 0; x < tilesX; x ++ ) {

			for ( let y = 0; y < tilesY; y ++ ) {

				const child = this.expand( 0, x, y );
				tileset.root.children.push( child );

				const { box } = child.boundingVolume;
				const [ cx, cy ] = box;
				const hx = box[ 4 ];
				const hy = box[ 8 ];

				minX = Math.min( minX, cx - hx );
				maxX = Math.max( maxX, cx + hx );

				minY = Math.min( minY, cy - hy );
				maxY = Math.max( maxY, cy + hy );

			}

		}

		const bw = maxX - minX;
		const bh = maxY - minY;
		tileset.root.boundingVolume.box = [
			minX + bw / 2, minY + bh / 2, 0,
			bw / 2, 0, 0,
			0, bh / 2, 0,
			0, 0, 0,
		];

		this.tiles.preprocessTileSet( tileset, baseUrl );
		return tileset;

	}

	getUrl( level, x, y ) {

		// override

	}

	expand( level, x, y ) {

		const { maxLevel, width, height, overlap, pixelSize, center, tileWidth, tileHeight, flipY } = this;

		// offset for the image so it's center
		const offsetX = center ? pixelSize * - width / 2 : 0;
		const offsetY = center ? pixelSize * - height / 2 : 0;

		const levelFactor = 2 ** - ( maxLevel - level );
		const levelWidth = Math.ceil( width * levelFactor );
		const levelHeight = Math.ceil( height * levelFactor );

		let tileX = tileWidth * x - overlap;
		let tileY = tileHeight * y - overlap;
		let tileWidthOverlap = tileWidth + overlap * 2;
		let tileHeightOverlap = tileHeight + overlap * 2;

		// adjust the starting position of the tile to the edge of the image
		if ( tileX < 0 ) {

			tileWidthOverlap += tileX;
			tileX = 0;

		}

		if ( tileY < 0 ) {

			tileHeightOverlap += tileY;
			tileY = 0;

		}

		// clamp the dimensions to the edge of the image
		if ( tileX + tileWidthOverlap > levelWidth ) {

			tileWidthOverlap -= tileX + tileWidthOverlap - levelWidth;

		}

		if ( tileY + tileHeightOverlap > levelHeight ) {

			tileHeightOverlap -= tileY + tileHeightOverlap - levelHeight;

		}

		// If this section doesn't cover an image then discard it
		if ( tileHeightOverlap <= 0 || tileWidthOverlap <= 0 ) {

			return null;

		}

		// the center of the tile
		const centerX = tileX + tileWidthOverlap / 2;
		const centerY = tileY + tileHeightOverlap / 2;

		// the pixel ratio of the image
		const ratioX = width / levelWidth;
		const ratioY = height / levelHeight;
		const flipFactor = flipY ? - 1 : 1;

		return {
		// Generate the node
			refine: 'REPLACE',
			geometricError: pixelSize * ( Math.max( width / levelWidth, height / levelHeight ) - 1 ),
			boundingVolume: {
				// DZI operates in a left handed coordinate system so we have to flip y to orient it correctly. FlipY
				// is also enabled on the image bitmap texture generation above.
				box: [
					// center
					ratioX * pixelSize * centerX + offsetX, flipFactor * ( ratioY * pixelSize * centerY + offsetY ), 0,

					// x, y, z half vectors
					ratioX * pixelSize * tileWidthOverlap / 2, 0.0, 0.0,
					0.0, ratioY * pixelSize * tileHeightOverlap / 2, 0.0,
					0.0, 0.0, 0,
				],
			},
			content: {
				uri: this.getUrl( level, x, y ),
			},
			children: [],

			// save the tile params so we can expand later
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			[ TILE_LEVEL ]: level,
		};

	}

}

// Support for XYZ / Slippy tile systems
// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export class XYZTilesPlugin extends ImageFormatPlugin {

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

		return this.getTileset( url );

	}

	getUrl( level, x, y ) {

		return this.url.replace( '{z}', level ).replace( '{x}', x ).replace( '{y}', y );

	}

}

// TODO
// - fix 3827
// - fix bing maps
// - fix sentinal-2 data set

// Support for TMS tiles
// https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification
export class TMSTilesPlugin extends ImageFormatPlugin {

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

				// TODO: "unitsPerPixel" may not be necessary
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
				// the extents of the tile set in lat / lon
				// const minX = parseFloat( boundingBox.getAttribute( 'minx' ) );
				// const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) );
				// const minY = parseFloat( boundingBox.getAttribute( 'miny' ) );
				// const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) );
				// const width = maxX - minX;
				// const height = maxY - minY;

				// origin in lat / lon
				// const x = parseFloat( origin.getAttribute( 'x' ) );
				// const y = parseFloat( origin.getAttribute( 'y' ) );

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );

				const profile = tileSets.getAttribute( 'profile' );
				// const srs = xml.querySelector( 'SRS' ).textContent;

				// if ( srs !== 'EPSG:3857' ) {

				// 	// EPSG:4326
				// 	throw new Error( `TMSTilesPlugin: ${ srs } SRS not supported.` );

				// }

				// if ( profile !== 'mercator' && profile !== 'global-mercator' ) {

				// 	// 'geodetic', 'global-geodetic'
				// 	throw new Error( `TMSTilesPlugin: Profile ${ profile } not supported.` );

				// }

				// TODO: global-geodetic seems to require two horizontal root tiles. Is hardcoding the right way?
				let widthMultiplier = 1;
				// let heightMultiplier = 1;
				switch ( profile ) {

					case 'global-geodetic':
						widthMultiplier = 2;
						break;

				}

				const levels = tileSetList.length;
				const maxLevel = levels - 1;
				this.extension = extension;
				this.width = widthMultiplier * tileWidth * ( 2 ** maxLevel );
				this.height = tileHeight * ( 2 ** maxLevel );
				this.tileWidth = tileWidth;
				this.tileHeight = tileHeight;
				this.levels = levels;
				this.url = this.tiles.rootURL;
				this.tileSets = tileSetList;

				return this.getTileset( url );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ tileSets[ level ].href }/${ x }/${ y }.${ extension }`, url ).toString();

	}

}

// Support for Deep Zoom Image format
// https://openseadragon.github.io/
// https://learn.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)
export class DeepZoomImagePlugin extends ImageFormatPlugin {

	constructor( ...args ) {

		super( ...args );

		this.name = 'DZI_TILES_PLUGIN';
		this.stem = null;
		this.format = null;
		this.flipY = true;

	}

	getUrl( level, x, y ) {

		return `${ this.stem }_files/${ level }/${ x }_${ y }.${ this.format }`;

	}

	loadRootTileSet() {

		const { tiles } = this;

		// transform the url
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		// If implementing DeepZoom with limitations like a fixed orthographic camera perspective then
		// the target tile level can be immediately "jumped" to for the entire image and in-view tiles
		// can be immediately queried without any hierarchy traversal. Due the flexibility of camera
		// type, rotation, and per-tile error calculation we generate a hierarchy.
		return tiles
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.tiles.fetchOptions ) )
			.then( res => res.text() )
			.then( text => {

				const xml = new DOMParser().parseFromString( text, 'text/xml' );
				if ( xml.querySelector( 'DisplayRects' ) || xml.querySelector( 'Collection' ) ) {

					throw new Error( 'DeepZoomImagesPlugin: DisplayRect and Collection DZI files not supported.' );

				}

				// Elements
				const image = xml.querySelector( 'Image' );
				const size = image.querySelector( 'Size' );

				// Image properties
				const tileSize = parseInt( image.getAttribute( 'TileSize' ) );
				this.tileWidth = tileSize;
				this.tileHeight = tileSize;
				this.overlap = parseInt( image.getAttribute( 'Overlap' ) );
				this.format = image.getAttribute( 'Format' );
				this.width = parseInt( size.getAttribute( 'Width' ) );
				this.height = parseInt( size.getAttribute( 'Height' ) );
				this.levels = Math.ceil( Math.log2( Math.max( this.width, this.height ) ) ) + 1;
				this.stem = url.split( /\.[^.]+$/g )[ 0 ];

				return this.getTileset( url );

			} );

	}

}
