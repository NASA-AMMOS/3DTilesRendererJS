import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';

export const TILE_X = Symbol( 'TILE_X' );
export const TILE_Y = Symbol( 'TILE_Y' );
export const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

// Base class for supporting tiled images with a consistent size / resolution per tile
export class ImageFormatPlugin {

	get tiling() {

		return this.imageSource.tiling;

	}

	constructor( options = {} ) {

		const {
			pixelSize = 0.01,
			center = false,
			useRecommendedSettings = true,
			imageSource = null,
		} = options;

		this.priority = - 10;
		this.tiles = null;

		// tiling scheme
		this.imageSource = imageSource;

		// options
		this.pixelSize = pixelSize;
		this.center = center;
		this.useRecommendedSettings = useRecommendedSettings;

	}

	// Plugin functions
	init( tiles ) {

		if ( this.useRecommendedSettings ) {

			tiles.errorTarget = 1;
			// TODO: apply skip traversal settings here once supported, as well, for faster loading

		}

		this.tiles = tiles;

		this.imageSource.fetchOptions = tiles.fetchOptions;
		this.imageSource.fetchData = ( url, options ) => {

			tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
			return tiles.invokeOnePlugin( plugin => plugin !== this && plugin.fetchData && plugin.fetchData( url, options ) );

		};

	}

	async loadRootTileSet() {

		const { tiles, imageSource } = this;
		let url = tiles.rootURL;
		tiles.invokeAllPlugins( plugin => url = plugin.preprocessURL ? plugin.preprocessURL( url, null ) : url );
		await imageSource.init( url );

		return this.getTileset( url );

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		// Construct texture
		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const texture = await this.imageSource.processBufferToTexture( buffer );
		this.imageSource.setData( tx, ty, level, texture );

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
		const mesh = new Mesh( new PlaneGeometry( 2 * sx, 2 * sy ), new MeshBasicMaterial( { map: texture, transparent: true } ) );
		mesh.position.set( x, y, z );

		return mesh;

	}

	preprocessNode( tile ) {

		// generate children
		const { tiling } = this;
		const maxLevel = tiling.maxLevel;
		const level = tile[ TILE_LEVEL ];
		if ( level < maxLevel && tile.parent !== null ) {

			this.expandChildren( tile );

		}

	}

	disposeTile( tile ) {

		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const { imageSource } = this;
		if ( imageSource.has( tx, ty, level ) ) {

			// only dispose of the image data if it hasn't been aborted
			imageSource.release( tx, ty, level );

		}

	}

	// Local functions
	getTileset( baseUrl ) {

		const { tiling, tiles } = this;
		const minLevel = tiling.minLevel;
		const { tileCountX, tileCountY } = tiling.getLevel( minLevel );

		// generate all children for the root
		const children = [];
		for ( let x = 0; x < tileCountX; x ++ ) {

			for ( let y = 0; y < tileCountY; y ++ ) {

				const child = this.createChild( x, y, minLevel );
				if ( child !== null ) {

					children.push( child );

				}

			}

		}

		// generate tile set
		const tileset = {
			asset: {
				version: '1.1'
			},
			geometricError: 1e5,
			root: {
				refine: 'REPLACE',
				geometricError: 1e5,
				boundingVolume: this.createBoundingVolume( 0, 0, - 1 ),
				children,

				[ TILE_LEVEL ]: - 1,
				[ TILE_X ]: 0,
				[ TILE_Y ]: 0,
			}
		};

		tiles.preprocessTileSet( tileset, baseUrl );

		return tileset;

	}

	getUrl( x, y, level ) {

		return this.imageSource.getUrl( x, y, level );

	}

	createBoundingVolume( x, y, level ) {

		const { center, pixelSize, tiling } = this;
		const { pixelWidth, pixelHeight } = tiling.getLevel( tiling.maxLevel );

		// calculate the world space bounds position from the range
		const [ minX, minY, maxX, maxY ] = level === - 1 ? tiling.getFullBounds( true ) : tiling.getTileBounds( x, y, level, true );
		let extentsX = ( maxX - minX ) / 2;
		let extentsY = ( maxY - minY ) / 2;
		let centerX = minX + extentsX;
		let centerY = minY + extentsY;
		if ( center ) {

			centerX -= 0.5;
			centerY -= 0.5;

		}

		// scale the fields
		centerX *= pixelWidth * pixelSize;
		extentsX *= pixelWidth * pixelSize;

		centerY *= pixelHeight * pixelSize;
		extentsY *= pixelHeight * pixelSize;

		// return bounding box
		return {
			box: [
				// center
				centerX, centerY, 0,

				// x, y, z half vectors
				extentsX, 0.0, 0.0,
				0.0, extentsY, 0.0,
				0.0, 0.0, 0.0,
			],
		};

	}

	createChild( x, y, level ) {

		const { pixelSize, tiling } = this;
		if ( ! tiling.getTileExists( x, y, level ) ) {

			return null;

		}

		// the scale ration of the image at this level
		const { pixelWidth, pixelHeight } = tiling.getLevel( tiling.maxLevel );
		const { pixelWidth: levelWidth, pixelHeight: levelHeight } = tiling.getLevel( level );
		const geometricError = pixelSize * ( Math.max( pixelWidth / levelWidth, pixelHeight / levelHeight ) - 1 );

		// Generate the node
		return {
			refine: 'REPLACE',
			geometricError: geometricError,
			boundingVolume: this.createBoundingVolume( x, y, level ),
			content: {
				uri: this.getUrl( x, y, level ),
			},
			children: [],

			// save the tile params so we can expand later
			[ TILE_X ]: x,
			[ TILE_Y ]: y,
			[ TILE_LEVEL ]: level,
		};

	}

	expandChildren( tile ) {

		const level = tile[ TILE_LEVEL ];
		const x = tile[ TILE_X ];
		const y = tile[ TILE_Y ];

		for ( let cx = 0; cx < 2; cx ++ ) {

			for ( let cy = 0; cy < 2; cy ++ ) {

				const child = this.createChild( 2 * x + cx, 2 * y + cy, level + 1 );
				if ( child ) {

					tile.children.push( child );

				}

			}

		}

	}

}
