import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';

const TILE_X = Symbol( 'TILE_X' );
const TILE_Y = Symbol( 'TILE_Y' );
const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

// Base class for supporting tiled images with a consistent size / resolution per tile
class ImageFormatPlugin {

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			center = false,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		this.tileWidth = null;
		this.tileHeight = null;
		this.width = null;
		this.height = null;
		this.levels = null;
		this.maxZoom = Infinity;
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
		const { flipY } = this;
		const blob = new Blob( [ buffer ] );
		const imageBitmap = await createImageBitmap( blob, {
			premultiplyAlpha: 'none',
			colorSpaceConversion: 'none',
			imageOrientation: flipY ? 'flipY' : 'from-image',
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
		const { levels } = this;
		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		if ( level < levels ) {

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
			root: this.expand( 0, 0, 0 ),
		};

		this.tiles.preprocessTileSet( tileset, baseUrl );
		return tileset;

	}

	getUrl( level, x, y ) {

		// override

	}

	expand( level, x, y ) {

		const { levels, width, height, overlap, pixelSize, center, tileWidth, tileHeight, flipY } = this;

		// offset for the image so it's center
		const offsetX = center ? pixelSize * - width / 2 : 0;
		const offsetY = center ? pixelSize * - height / 2 : 0;

		const levelFactor = 2 ** - ( levels - level );
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

		// Generate the root node
		return {
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
			levels = 19,
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
		const { tiles, tileWidth, tileHeight, levels } = this;
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );

		this.width = tileWidth * ( 2 ** levels );
		this.height = tileHeight * ( 2 ** levels );
		this.url = url;

		return this.getTileset( url );

	}

	getUrl( level, x, y ) {

		return this.url.replace( '{z}', level ).replace( '{x}', x ).replace( '{y}', y );

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
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( url, this.fetchOptions ) )
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
				this.levels = Math.ceil( Math.log2( Math.max( this.width, this.height ) ) );
				this.stem = url.split( /\.[^.]+$/g )[ 0 ];

				return this.getTileset( url );

			} );

	}

}
