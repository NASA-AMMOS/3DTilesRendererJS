import { Mesh, MeshBasicMaterial, PlaneGeometry, MathUtils, Vector2 } from 'three';

const _uv = /* @__PURE__ */ new Vector2();

export const TILE_X = Symbol( 'TILE_X' );
export const TILE_Y = Symbol( 'TILE_Y' );
export const TILE_LEVEL = Symbol( 'TILE_LEVEL' );

/**
 * Base plugin class for tiled image sources with a consistent size and resolution per
 * tile. Subclasses provide a concrete `imageSource` and override `getUrl` and
 * `createBoundingVolume` as needed.
 * @param {Object} [options]
 * @param {Object} [options.imageSource=null] Image source that provides tiling metadata and URL generation.
 * @param {boolean} [options.center=false] Shift tiles so the image is centered at the origin.
 * @param {boolean} [options.useRecommendedSettings=true] Apply recommended `TilesRenderer` settings (e.g. `errorTarget = 1`).
 */
export class ImageFormatPlugin {

	get tiling() {

		return this.imageSource.tiling;

	}

	constructor( options = {} ) {

		const {
			pixelSize = null,
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

		if ( pixelSize !== null ) {

			console.warn( 'ImageFormatPlugin: "pixelSize" has been deprecated in favor of scaling the tiles root.' );

		}

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

	async loadRootTileset() {

		const { tiles, imageSource } = this;
		imageSource.url = imageSource.url || tiles.rootURL;
		tiles.invokeAllPlugins( plugin => imageSource.url = plugin.preprocessURL ? plugin.preprocessURL( imageSource.url, null ) : imageSource.url );
		await imageSource.init();

		tiles.rootURL = imageSource.url;
		return this.getTileset( imageSource.url );

	}

	async parseToMesh( buffer, tile, extension, uri, abortSignal ) {

		if ( abortSignal.aborted ) {

			return null;

		}

		// Construct texture
		const { imageSource } = this;
		const tx = tile[ TILE_X ];
		const ty = tile[ TILE_Y ];
		const level = tile[ TILE_LEVEL ];
		const texture = await imageSource.processBufferToTexture( buffer );

		// clean up the texture if it's not going to be used.
		if ( abortSignal.aborted ) {

			texture.dispose();
			texture.image.close();
			return null;

		}

		imageSource.setData( tx, ty, level, texture );

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
		const geometry = new PlaneGeometry( 2 * sx, 2 * sy );
		const mesh = new Mesh( geometry, new MeshBasicMaterial( { map: texture, transparent: true } ) );
		mesh.position.set( x, y, z );

		const tiling = imageSource.tiling;
		const uvRange = tiling.getTileContentUVBounds( tx, ty, level );
		const { uv } = geometry.attributes;
		for ( let i = 0; i < uv.count; i ++ ) {

			_uv.fromBufferAttribute( uv, i );
			_uv.x = MathUtils.mapLinear( _uv.x, 0, 1, uvRange[ 0 ], uvRange[ 2 ] );
			_uv.y = MathUtils.mapLinear( _uv.y, 0, 1, uvRange[ 1 ], uvRange[ 3 ] );
			uv.setXY( i, _uv.x, _uv.y );

		}

		return mesh;

	}

	ensureChildrenAreExpanded( tile ) {

		if ( ! ( TILE_LEVEL in tile ) ) {

			return;

		}

		const level = tile[ TILE_LEVEL ];
		if ( level === - 1 || level < this.tiling.maxLevel ) {

			// skip if all children are already present
			if ( tile._imageChildrenComplete ) {

				return;

			}

			this.expandChildren( tile );

		}

	}

	pruneUnusedSubtrees() {

		const { tiles } = this;
		if ( ! tiles.root ) {

			return;

		}

		this._pruneUnusedSubtrees( tiles.root );

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

		const { tiles } = this;
		const root = {
			refine: 'REPLACE',
			geometricError: Infinity,
			boundingVolume: this.createBoundingVolume( 0, 0, - 1 ),
			children: [],

			[ TILE_LEVEL ]: - 1,
			[ TILE_X ]: 0,
			[ TILE_Y ]: 0,
		};

		this.expandChildren( root );

		// generate tileset
		const tileset = {
			asset: {
				version: '1.1'
			},
			geometricError: Infinity,
			root,
		};

		tiles.preprocessTileset( tileset, baseUrl );

		return tileset;

	}

	getUrl( x, y, level ) {

		return this.imageSource.getUrl( x, y, level );

	}

	createBoundingVolume( x, y, level ) {

		const { center, pixelSize, tiling } = this;
		const { pixelWidth, pixelHeight } = tiling.getLevel( tiling.maxLevel );

		// calculate the world space bounds position from the range
		const [ minX, minY, maxX, maxY ] = level === - 1 ? tiling.getContentBounds( true ) : tiling.getTileBounds( x, y, level, true );
		let extentsX = ( maxX - minX ) / 2;
		let extentsY = ( maxY - minY ) / 2;
		let centerX = minX + extentsX;
		let centerY = minY + extentsY;
		if ( center ) {

			centerX -= 0.5;
			centerY -= 0.5;

		}

		// scale the fields
		if ( pixelSize ) {

			centerX *= pixelWidth * pixelSize;
			extentsX *= pixelWidth * pixelSize;

			centerY *= pixelHeight * pixelSize;
			extentsY *= pixelHeight * pixelSize;

		} else {

			centerX *= tiling.aspectRatio;
			extentsX *= tiling.aspectRatio;

		}

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

		// Calculate geometric error: size of one pixel in world space.
		// The tile contents span [0, 1] along Y and [0, aspectRatio] along X.
		const { pixelWidth, pixelHeight } = tiling.getLevel( level );
		let geometricError = Math.max( tiling.aspectRatio / pixelWidth, 1 / pixelHeight );

		// apply deprecated pixelSize scaling if specified
		if ( pixelSize ) {

			const maxLevelInfo = tiling.getLevel( tiling.maxLevel );
			geometricError *= pixelSize * Math.max( maxLevelInfo.pixelWidth, maxLevelInfo.pixelHeight );

		}

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
		const existingChildren = new Set();
		const { children } = tile;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const child = children[ i ];
			if ( TILE_LEVEL in child ) {

				existingChildren.add( `${ child[ TILE_LEVEL ] }:${ child[ TILE_X ] }:${ child[ TILE_Y ] }` );

			}

		}

		const insertionPoint = children.length - ( tile.internal?.virtualChildCount || 0 );
		const pendingChildren = [];
		if ( level === - 1 ) {

			const minLevel = this.tiling.minLevel;
			const { tileCountX, tileCountY } = this.tiling.getLevel( minLevel );
			for ( let x = 0; x < tileCountX; x ++ ) {

				for ( let y = 0; y < tileCountY; y ++ ) {

					const key = `${ minLevel }:${ x }:${ y }`;
					if ( existingChildren.has( key ) ) {

						continue;

					}

					const child = this.createChild( x, y, minLevel );
					if ( child ) {

						pendingChildren.push( child );

					}

				}

			}

		} else if ( level < this.tiling.maxLevel ) {

			const x = tile[ TILE_X ];
			const y = tile[ TILE_Y ];
			const { tileSplitX, tileSplitY } = this.tiling.getLevel( level );
			for ( let cx = 0; cx < tileSplitX; cx ++ ) {

				for ( let cy = 0; cy < tileSplitY; cy ++ ) {

					const childX = tileSplitX * x + cx;
					const childY = tileSplitY * y + cy;
					const childLevel = level + 1;
					const key = `${ childLevel }:${ childX }:${ childY }`;
					if ( existingChildren.has( key ) ) {

						continue;

					}

					const child = this.createChild( childX, childY, childLevel );
					if ( child ) {

						pendingChildren.push( child );

					}

				}

			}

		}

		if ( pendingChildren.length > 0 ) {

			children.splice( insertionPoint, 0, ...pendingChildren );
			tile._imageChildrenComplete = false;

		} else {

			tile._imageChildrenComplete = true;

		}

	}

	_pruneUnusedSubtrees( tile ) {

		const { children } = tile;
		for ( let i = 0; i < children.length; i ++ ) {

			const child = children[ i ];
			if ( ! ( TILE_LEVEL in child ) ) {

				continue;

			}

			if ( this._canPruneSubtree( child ) ) {

				this._disposeSubtree( child );
				children.splice( i, 1 );
				i --;
				tile._imageChildrenComplete = false;

			} else {

				this._pruneUnusedSubtrees( child );

			}

		}

	}

	_canPruneSubtree( tile ) {

		if ( this._isTileRetained( tile ) ) {

			return false;

		}

		const { children } = tile;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			if ( ! this._canPruneSubtree( children[ i ] ) ) {

				return false;

			}

		}

		return true;

	}

	_isTileRetained( tile ) {

		const { tiles } = this;
		return tiles.lruCache.has( tile ) || Boolean( tile.traversal && (
			tile.traversal.used ||
			tile.traversal.usedLastFrame ||
			tile.traversal.active ||
			tile.traversal.visible ||
			tile.traversal.wasSetActive ||
			tile.traversal.wasSetVisible
		) );

	}

	_disposeSubtree( tile ) {

		const { tiles } = this;
		const { children } = tile;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			this._disposeSubtree( children[ i ] );

		}

		tiles.processNodeQueue.remove( tile );
		const queuedIndex = tiles.queuedTiles.indexOf( tile );
		if ( queuedIndex !== - 1 ) {

			tiles.queuedTiles.splice( queuedIndex, 1 );

		}

		tiles.usedSet.delete( tile );
		tiles.loadingTiles.delete( tile );
		tiles.activeTiles.delete( tile );
		tiles.visibleTiles.delete( tile );
		tiles.lruCache.remove( tile );

		tile.parent = null;
		tile.children.length = 0;

	}

}
