import { MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';
import { WGS84_ELLIPSOID } from '../../three/math/GeoConstants';

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
				const hx = box[ 3 ];
				const hy = box[ 7 ];

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
					0.0, 0.0, 0.0,
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

// TODO: we shouldn't modify the ellipsoid of the tileset. We should deproject using the appropriately
// ellipsoid and map it to the ellipsoid provided by the tiles renderer.
class EllipsoidProjectionTilesPlugin extends ImageFormatPlugin {

	constructor( options = {} ) {

		const {
			shape = 'planar',
			...rest
		} = options;

		super( rest );

		this.shape = shape;
		this.projection = 'geodetic';
		this.minLat = - Math.PI / 2;
		this.maxLat = Math.PI / 2;
		this.minLon = - Math.PI;
		this.maxLon = Math.PI;

	}

	getTileset( ...args ) {

		const { shape, minLat, maxLat, minLon, maxLon } = this;
		const tileset = this.getTileset( ...args );
		if ( shape === 'ellipsoid' ) {

			// TODO: confirm these lat / lon position are correct - ie positive / negative value mapping
			tileset.root.boundingVolume.region = [
				minLon, minLat, maxLon, maxLat,
				0, 0, // min / max height
			];

			delete tileset.root.boundingVolume.box;

		}

	}

	expand( ...args ) {

		const { shape, projection, tiles, minLat, maxLat, minLon, maxLon } = this;
		const node = super.expand( ...args );
		if ( shape === 'ellipsoid' ) {

			const rootBox = tiles.root.boundingVolume.box;
			const tileBox = node.boundingVolume.box;
			const rootMinX = rootBox[ 0 ] - rootBox[ 3 ];
			const rootMaxX = rootBox[ 0 ] + rootBox[ 3 ];
			const rootMinY = rootBox[ 1 ] - rootBox[ 7 ];
			const rootMaxY = rootBox[ 1 ] + rootBox[ 7 ];
			const tileMinX = tileBox[ 0 ] - tileBox[ 3 ];
			const tileMaxX = tileBox[ 0 ] + tileBox[ 3 ];
			const tileMinY = tileBox[ 1 ] - tileBox[ 7 ];
			const tileMaxY = tileBox[ 1 ] + tileBox[ 7 ];

			// TODO: we need to handle the geodetic WGS84 projection here
			if ( projection === 'mercator' ) {

				const minHeight = Math.tan( minLat );
				const maxHeight = Math.tan( maxLat );
				const northRatio = MathUtils.mapLinear( tileMinY, rootMinY, rootMaxY, minHeight, maxHeight );
				const southRatio = MathUtils.mapLinear( tileMaxY, rootMinY, rootMaxY, minHeight, maxHeight );

				const north = Math.atan( northRatio );
				const south = Math.atan( southRatio );
				const east = MathUtils.mapLinear( tileMinX, rootMinX, rootMaxX, minLon, maxLon );
				const west = MathUtils.mapLinear( tileMaxX, rootMinX, rootMaxX, minLon, maxLon );
				node.boundingVolume.region = [
					west, south, east, north,
					0, 0, // min / max height
				];

				delete node.boundingVolume.box;

			}

		}

	}

}

// Support for XYZ / Slippy tile systems
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
		tiles.ellipsoid.radius.setScalar( WGS84_ELLIPSOID.radius.x );

		return this.getTileset( url );

	}

	getUrl( level, x, y ) {

		return this.url.replace( '{z}', level ).replace( '{x}', x ).replace( '{y}', y );

	}

}

// TODO
// - fix 3827
// - fix bing maps

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
				const boundingBox = xml.querySelector( 'BoundingBox' );
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
				const minX = parseFloat( boundingBox.getAttribute( 'minx' ) );
				const maxX = parseFloat( boundingBox.getAttribute( 'maxx' ) );
				const minY = parseFloat( boundingBox.getAttribute( 'miny' ) );
				const maxY = parseFloat( boundingBox.getAttribute( 'maxy' ) );

				// origin in lat / lon
				// const x = parseFloat( origin.getAttribute( 'x' ) );
				// const y = parseFloat( origin.getAttribute( 'y' ) );

				// image dimensions in pixels
				const tileWidth = parseInt( tileFormat.getAttribute( 'width' ) );
				const tileHeight = parseInt( tileFormat.getAttribute( 'height' ) );
				const extension = tileFormat.getAttribute( 'extension' );

				const profile = tileSets.getAttribute( 'profile' );
				const srs = xml.querySelector( 'SRS' ).textContent;

				const ellipsoid = this.tiles.ellipsoid;
				switch ( srs ) {

					// web-mercator spherical projection
					case 'EPSG:3857':
						ellipsoid.radius.setScalar( WGS84_ELLIPSOID.radius.x );
						break;
					case 'EPSG:4326':
						ellipsoid.copy( WGS84_ELLIPSOID );
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
						break;
					case 'mercator':
					case 'global-mercator':
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
				this.minLat = minY;
				this.maxLat = maxY;
				this.minLon = minX;
				this.maxLon = maxX;

				return this.getTileset( url );

			} );

	}

	getUrl( level, x, y ) {

		const { url, extension, tileSets } = this;
		return new URL( `${ parseInt( tileSets[ level ].href ) }/${ x }/${ y }.${ extension }`, url ).toString();

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
