import { MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';

export const TILE_X = Symbol( 'TILE_X' );
export const TILE_Y = Symbol( 'TILE_Y' );
export const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
export const UV_BOUNDS = Symbol( 'UV_BOUNDS' );

// Base class for supporting tiled images with a consistent size / resolution per tile
export class ImageFormatPlugin {

	get maxLevel() {

		return this.levels - 1;

	}

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			center = false,
			useRecommendedSettings = true,
		} = options;

		this.priority = - 10;
		this.tiles = null;
		this.processCallback = null;

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
		this.useRecommendedSettings = useRecommendedSettings;
		this.flipY = false;

	}

	// Plugin functions
	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;
			// TODO: apply skip traversal settings here once supported, as well, for faster loading

		}

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
		let sx = 1, sy = 1;
		let x = 0, y = 0, z = 0;

		const boundingBox = tile.boundingVolume.box;
		if ( boundingBox ) {

			[ x, y, z ] = boundingBox;
			sx = boundingBox[ 3 ];
			sy = boundingBox[ 7 ];

		}

		// adjust the geometry transform itself rather than the mesh because it reduces the artifact errors
		// when using batched mesh rendering.
		const mesh = new Mesh( new PlaneGeometry( 2 * sx, 2 * sy ), new MeshBasicMaterial( { map: texture } ) );
		mesh.position.set( x, y, z );

		return mesh;

	}

	preprocessNode( tile, dir, parentTile ) {

		// generate children
		const { maxLevel } = this;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel ) {

			this.expandChildren( tile );

		}

	}

	// Local functions
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

		const { maxLevel, width, height, tileWidth, tileHeight, center, pixelSize } = this;
		const levelFactor = 2 ** - maxLevel;
		const tilesX = Math.ceil( levelFactor * width / tileWidth );
		const tilesY = Math.ceil( levelFactor * height / tileHeight );

		// generate all children for the root
		for ( let x = 0; x < tilesX; x ++ ) {

			for ( let y = 0; y < tilesY; y ++ ) {

				tileset.root.children.push( this.createChild( 0, x, y ) );

			}

		}

		// construct the full bounding box
		const minX = center ? - width / 2 : 0;
		const minY = center ? - height / 2 : 0;
		tileset.root.boundingVolume.box = [
			pixelSize * ( minX + width / 2 ), pixelSize * ( minY + height / 2 ), 0,
			pixelSize * width / 2, 0, 0,
			0, pixelSize * height / 2, 0,
			0, 0, 0,
		];

		tileset.root[ UV_BOUNDS ] = [ 0, 0, 1, 1 ];

		this.tiles.preprocessTileSet( tileset, baseUrl );
		return tileset;

	}

	getUrl( level, x, y ) {

		// override

	}

	createChild( level, x, y ) {

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
		let centerY = tileY + tileHeightOverlap / 2;
		if ( flipY ) {

			centerY = levelHeight - centerY;

		}

		// the pixel ratio of the image
		const ratioX = width / levelWidth;
		const ratioY = height / levelHeight;

		const boxX = ratioX * pixelSize * centerX;
		const boxY = ratioY * pixelSize * centerY;
		const extentsX = ratioX * pixelSize * tileWidthOverlap / 2;
		const extentsY = ratioY * pixelSize * tileHeightOverlap / 2;

		// Generate the node
		return {
			refine: 'REPLACE',
			geometricError: pixelSize * ( Math.max( width / levelWidth, height / levelHeight ) - 1 ),
			boundingVolume: {
				// DZI operates in a left handed coordinate system so we have to flip y to orient it correctly. FlipY
				// is also enabled on the image bitmap texture generation above.
				box: [
					// center
					boxX + offsetX, boxY + offsetY, 0,

					// x, y, z half vectors
					extentsX, 0.0, 0.0,
					0.0, extentsY, 0.0,
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
			[ UV_BOUNDS ]: [
				MathUtils.mapLinear( boxX - extentsX, 0, pixelSize * width, 0, 1 ),
				MathUtils.mapLinear( boxY - extentsY, 0, pixelSize * height, 0, 1 ),
				MathUtils.mapLinear( boxX + extentsX, 0, pixelSize * width, 0, 1 ),
				MathUtils.mapLinear( boxY + extentsY, 0, pixelSize * height, 0, 1 ),
			],
		};

	}

	expandChildren( tile ) {

		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];
		for ( let cx = 0; cx < 2; cx ++ ) {

			for ( let cy = 0; cy < 2; cy ++ ) {

				const child = this.createChild( level + 1, 2 * x + cx, 2 * y + cy );
				if ( child ) {

					tile.children.push( child );

				}

			}

		}

	}

}
