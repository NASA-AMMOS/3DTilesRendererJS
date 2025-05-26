import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture } from 'three';
import { TilingScheme } from './utils/TilingScheme.js';

export const TILE_X = Symbol( 'TILE_X' );
export const TILE_Y = Symbol( 'TILE_Y' );
export const TILE_LEVEL = Symbol( 'TILE_LEVEL' );
export const UV_BOUNDS = Symbol( 'UV_BOUNDS' );

// Base class for supporting tiled images with a consistent size / resolution per tile
export class ImageFormatPlugin {

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			center = false,
			useRecommendedSettings = true,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		// amount of pixel overlap between tiles
		this.tiling = new TilingScheme();
		this.overlap = 0;

		// options
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
		const { tiling } = this;
		const maxLevel = tiling.maxLevel;
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

		const { center, pixelSize, tiling } = this;
		const { pixelHeight, pixelWidth, tileCountX, tileCountY } = tiling.getLevel( tiling.minLevel );

		// generate all children for the root
		for ( let x = 0; x < tileCountX; x ++ ) {

			for ( let y = 0; y < tileCountY; y ++ ) {

				tileset.root.children.push( this.createChild( 0, x, y ) );

			}

		}

		// construct the full bounding box
		const minX = center ? - pixelWidth / 2 : 0;
		const minY = center ? - pixelHeight / 2 : 0;
		tileset.root.boundingVolume.box = [
			pixelSize * ( minX + pixelWidth / 2 ), pixelSize * ( minY + pixelHeight / 2 ), 0,
			pixelSize * pixelWidth / 2, 0, 0,
			0, pixelSize * pixelHeight / 2, 0,
			0, 0, 0,
		];

		tileset.root[ UV_BOUNDS ] = [ 0, 0, 1, 1 ];

		this.tiles.preprocessTileSet( tileset, baseUrl );

		console.log( tileset.root.children[ 0 ].geometricError )
		return tileset;

	}

	getUrl( level, x, y ) {

		// override

	}

	createChild( level, x, y ) {

		const { overlap, pixelSize, center, flipY, tiling } = this;
		const { pixelWidth, pixelHeight } = tiling.getLevel( tiling.maxLevel );

		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		// the scale ration of the image at this level
		const { pixelWidth: levelWidth, pixelHeight: levelHeight } = tiling.getLevel( level );
		const geometricError = pixelSize * ( Math.max( pixelWidth / levelWidth, pixelHeight / levelHeight ) - 1 );

		// get the normalize span of this tile relative to the image
		const span = tiling.getNormalizedTileSpan( x, y, level, overlap, flipY );

		// calculate the world space bounds position from the range
		const [ minX, minY, maxX, maxY ] = span;
		let extentsX = ( maxX - minX ) / 2;
		let extentsY = ( maxY - minY ) / 2;
		let centerX = minX + extentsX;
		let centerY = minY + extentsY;
		if ( center ) {

			centerX -= 0.5;
			centerY -= 0.5;

		}

		centerX *= pixelWidth * pixelSize;
		extentsX *= pixelWidth * pixelSize;

		centerY *= pixelHeight * pixelSize;
		extentsY *= pixelHeight * pixelSize;

		// Generate the node
		return {
			refine: 'REPLACE',
			geometricError: geometricError,
			boundingVolume: {
				// DZI operates in a left handed coordinate system so we have to flip y to orient it correctly. FlipY
				// is also enabled on the image bitmap texture generation above.
				box: [
					// center
					centerX, centerY, 0,

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
			[ UV_BOUNDS ]: span,
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
