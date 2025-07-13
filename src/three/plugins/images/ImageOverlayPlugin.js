import { WebGLRenderTarget, Color, SRGBColorSpace, BufferAttribute, Matrix4, Vector3, Box3, Triangle, CanvasTexture } from 'three';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { forEachTileInBounds, getMeshesCartographicRange, getMeshesPlanarRange } from './overlays/utils.js';
import { CesiumIonAuth } from '../../../core/plugins/auth/CesiumIonAuth.js';
import { PriorityQueue } from '../../../core/renderer/utilities/PriorityQueue.js';
import { wrapOverlaysMaterial } from './overlays/wrapOverlaysMaterial.js';
import { GoogleCloudAuth } from '../../../core/plugins/auth/GoogleCloudAuth.js';
import { GeometryClipper } from '../utilities/GeometryClipper.js';
import { safeTextureGetByteLength } from '../../renderer/tiles/utilities.js';

const _matrix = /* @__PURE__ */ new Matrix4();
const _vec = /* @__PURE__ */ new Vector3();
const _center = /* @__PURE__ */ new Vector3();
const _sphereCenter = /* @__PURE__ */ new Vector3();
const _normal = /* @__PURE__ */ new Vector3();
const _box = /* @__PURE__ */ new Box3();
const SPLIT_TILE_DATA = Symbol( 'SPLIT_TILE_DATA' );
const SPLIT_HASH = Symbol( 'SPLIT_HASH' );

// function for marking and releasing images in the given overlay
function markOverlayImages( range, level, overlay, doRelease ) {

	// return null immediately if possible to allow for drawing without delay where possible
	if ( Array.isArray( overlay ) ) {

		const promises = overlay
			.map( o => markOverlayImages( range, level, o, doRelease ) )
			.filter( p => p !== null );

		if ( promises.length === 0 ) {

			return null;

		} else {

			return Promise.all( promises );

		}

	}

	if ( ! overlay.isReady ) {

		return overlay.whenReady().then( markImages );

	} else {

		return markImages();

	}

	function markImages() {

		const promises = [];
		const { imageSource, tiling } = overlay;
		forEachTileInBounds( range, level, tiling, overlay.isPlanarProjection, ( tx, ty, tl ) => {

			if ( doRelease ) {

				imageSource.release( tx, ty, tl );

			} else {

				promises.push( imageSource.lock( tx, ty, tl ) );

			}

		} );

		const filteredPromises = promises.filter( p => p instanceof Promise );
		if ( filteredPromises.length !== 0 ) {

			return Promise.all( filteredPromises );

		} else {

			return null;

		}

	}

}

// returns the total number of tiles that will be drawn for the provided range
function countTilesInRange( range, level, overlay ) {

	let total = 0;
	forEachTileInBounds( range, level, overlay.tiling, overlay.isPlanarProjection, ( x, y, l ) => {

		total ++;

	} );

	return total;

}

// Plugin for overlaying tiled image data on top of 3d tiles geometry.
export class ImageOverlayPlugin {

	get enableTileSplitting() {

		return this._enableTileSplitting;

	}

	set enableTileSplitting( v ) {

		if ( this._enableTileSplitting !== v ) {

			this._enableTileSplitting = v;
			this._markNeedsUpdate();

		}

	}

	constructor( options = {} ) {

		const {
			overlays = [],
			resolution = 256,
			renderer = null,
			enableTileSplitting = true,
		} = options;

		// plugin needs to run before other plugins that fetch data since content
		// is handled and loaded in a custom way
		this.name = 'IMAGE_OVERLAY_PLUGIN';
		this.priority = - 10;

		// options
		this.renderer = renderer;
		this.resolution = resolution;
		this._enableTileSplitting = enableTileSplitting;
		this.overlays = [];

		// internal
		this.needsUpdate = false;
		this.tiles = null;
		this.tileComposer = null;
		this.tileControllers = new Map();
		this.overlayInfo = new Map();
		this.usedTextures = new Set();
		this.meshParams = new WeakMap();
		this.pendingTiles = new Map();
		this.processQueue = null;
		this._onUpdateAfter = null;
		this._onTileDownloadStart = null;
		this._cleanupScheduled = false;
		this._virtualChildResetId = 0;
		this._bytesUsed = new WeakMap();

		overlays.forEach( overlay => {

			this.addOverlay( overlay );

		} );

	}

	// plugin functions
	init( tiles ) {

		const tileComposer = new TiledTextureComposer( this.renderer );
		const processQueue = new PriorityQueue();
		processQueue.maxJobs = 10;
		processQueue.priorityCallback = ( a, b ) => {

			const tileA = a.tile;
			const tileB = b.tile;

			const visibleA = tiles.visibleTiles.has( tileA );
			const visibleB = tiles.visibleTiles.has( tileB );
			if ( visibleA !== visibleB ) {

				// load visible tiles first
				return visibleA ? 1 : - 1;

			} else {

				// the fallback to the download queue tile priority
				return tiles.downloadQueue.priorityCallback( tileA, tileB );

			}

			// TODO: we could prioritize by overlay order here to ensure consistency

		};

		// save variables
		this.tiles = tiles;
		this.tileComposer = tileComposer;
		this.processQueue = processQueue;

		// init all existing tiles
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._processTileModel( scene, tile, true );

		} );

		// update callback for when overlays have changed
		this._onUpdateAfter = async () => {

			// check if the projection changed for any of the overlays and refresh them
			let overlayChanged = false;
			this.overlayInfo.forEach( ( info, overlay ) => {

				if (
					Boolean( overlay.frame ) !== Boolean( info.frame ) ||
					overlay.frame && info.frame && ! info.frame.equals( overlay.frame )
				) {

					const order = info.order;
					this.deleteOverlay( overlay, false );
					this.addOverlay( overlay, order );

					overlayChanged = true;

				}

			} );

			// trigger redraws for visible tiles if overlays updated
			if ( overlayChanged ) {

				const maxJobs = processQueue.maxJobs;
				let count = 0;
				processQueue.items.forEach( info => {

					if ( tiles.visibleTiles.has( info.tile ) ) {

						count ++;

					}

				} );

				processQueue.maxJobs = count + processQueue.currJobs;
				processQueue.tryRunJobs();
				processQueue.maxJobs = maxJobs;

				this.needsUpdate = true;

			}

			// update all the layer uvs
			if ( this.needsUpdate ) {

				this.needsUpdate = false;

				const { overlays, overlayInfo } = this;
				overlays.sort( ( a, b ) => {

					return overlayInfo.get( a ).order - overlayInfo.get( b ).order;

				} );

				tiles.forEachLoadedModel( ( scene, tile ) => {

					this._updateLayers( tile );

				} );

				this.resetVirtualChildren( ! this.enableTileSplitting );
				tiles.recalculateBytesUsed();

				tiles.dispatchEvent( { type: 'needs-rerender' } );

			}

		};

		this._onTileDownloadStart = ( { tile } ) => {

			this._initTileOverlayInfo( tile );

		};

		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-download-start', this._onTileDownloadStart );

		this.overlays.forEach( overlay => {

			this._initOverlay( overlay );

		} );

	}

	disposeTile( tile ) {

		const { overlayInfo, tileControllers, processQueue, pendingTiles } = this;

		// Cancel any ongoing tasks. If a tile is cancelled while downloading
		// this will not have been created, yet.
		if ( tileControllers.has( tile ) ) {

			tileControllers.get( tile ).abort();
			tileControllers.delete( tile );
			pendingTiles.delete( tile );

		}

		// stop any tile loads
		overlayInfo.forEach( ( ( { tileInfo }, overlay ) => {

			if ( tileInfo.has( tile ) ) {

				const { meshInfo, range, meshRange, level, target, meshRangeMarked, rangeMarked } = tileInfo.get( tile );

				// release the ranges
				if ( meshRange !== null && meshRangeMarked ) {

					markOverlayImages( meshRange, level, overlay, true );

				}

				if ( range !== null && rangeMarked ) {

					markOverlayImages( range, level, overlay, true );

				}

				if ( target !== null ) {

					// release the render targets
					target.dispose();

				}

				tileInfo.delete( tile );
				meshInfo.clear();

			}

		} ) );

		// Remove any items that reference the tile being disposed
		processQueue.removeByFilter( item => {

			return item.tile === tile;

		} );

	}

	calculateBytesUsed( tile ) {

		const { overlayInfo } = this;
		const bytesUsed = this._bytesUsed;

		let bytes = null;
		overlayInfo.forEach( ( { tileInfo }, overlay ) => {

			if ( tileInfo.has( tile ) ) {

				const { target } = tileInfo.get( tile );
				bytes = bytes || 0;
				bytes += safeTextureGetByteLength( target?.texture );

			}

		} );

		if ( bytes !== null ) {

			bytesUsed.set( tile, bytes );
			return bytes;

		} else if ( bytesUsed.has( tile ) ) {

			return bytesUsed.get( tile );

		} else {

			return 0;

		}

	}

	processTileModel( scene, tile ) {

		return this._processTileModel( scene, tile );

	}

	async _processTileModel( scene, tile, initialization = false ) {

		this.tileControllers.set( tile, new AbortController() );

		if ( ! initialization ) {

			// we save all these pending tiles so that they can be correctly initialized if an
			// overlay is added in the time between when this function starts and after the async
			// await call. Otherwise the tile could be missed. But if we're initializing the plugin
			// then we don't need to do this because the tiles are already included in the traversal.
			this.pendingTiles.set( tile, scene );

		}

		this._wrapMaterials( scene );
		this._initTileOverlayInfo( tile );
		await this._initTileSceneOverlayInfo( scene, tile );
		this.expandVirtualChildren( scene, tile ),
		this._updateLayers( tile );

		this.pendingTiles.delete( tile );

	}

	dispose() {

		const { tileComposer, tiles } = this;

		// dispose textures
		tileComposer.dispose();

		// dispose of all overlays
		const overlays = [ ...this.overlays ];
		overlays.forEach( overlay => {

			this.deleteOverlay( overlay );

		} );

		// reset the textures of the meshes
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this._updateLayers( tile );
			this.disposeTile( tile );

			delete tile[ SPLIT_HASH ];

		} );

		tiles.removeEventListener( 'update-after', this._onUpdateAfter );

		this.resetVirtualChildren( true );

	}

	getAttributions( target ) {

		this.overlays.forEach( overlay => {

			if ( overlay.opacity > 0 ) {

				overlay.getAttributions( target );

			}

		} );

	}

	parseToMesh( buffer, tile, extension, uri ) {

		if ( extension === 'image_overlay_tile_split' ) {

			return tile[ SPLIT_TILE_DATA ];

		}

	}

	async resetVirtualChildren( fullDispose = false ) {

		// only run this if all the overlays are ready and tile targets have been generated, etc
		// so we can make an effort to only remove the necessary tiles.
		this._virtualChildResetId ++;
		const id = this._virtualChildResetId;

		await Promise.all( this.overlays.map( o => o.whenReady() ) );

		if ( id !== this._virtualChildResetId ) {

			return;

		}

		// collect the tiles split into virtual tiles
		const { tiles } = this;
		const parents = new Set();
		tiles.forEachLoadedModel( ( scene, tile ) => {

			if ( SPLIT_HASH in tile ) {

				parents.add( tile );

			}

		} );

		// dispose of the virtual children if this tile would not be split or the spilt could change
		// under the current overlays used.
		parents.forEach( parent => {

			if ( parent.parent === null ) {

				return;

			}

			const clone = parent.cached.scene.clone();
			clone.updateMatrixWorld();

			const { hash } = this._getSplitVectors( clone, parent );
			if ( parent[ SPLIT_HASH ] !== hash || fullDispose ) {

				// TODO: if are parent tile is forcibly remove then we should make sure that all the children are, too?
				const children = collectChildren( parent );
				children.sort( ( a, b ) => ( b.__depth || 0 ) - ( a.__depth || 0 ) );

				// note that we need to remove children from the processing queue in this case
				// because we are forcibly evicting them from the cache.
				children.forEach( child => {

					tiles.processNodeQueue.remove( child );
					tiles.lruCache.remove( child );
					child.parent = null;

				} );

				parent.children.length = 0;
				parent.__childrenProcessed = 0;

			}

		} );

		// re-expand tiles if needed
		if ( ! fullDispose ) {

			tiles.forEachLoadedModel( ( scene, tile ) => {

				this.expandVirtualChildren( scene, tile );

			} );

		}

		function collectChildren( root, target = [] ) {

			root.children.forEach( child => {

				target.push( child );
				collectChildren( child, target );

			} );
			return target;

		}

	}

	_getSplitVectors( scene, tile, centerTarget = _center ) {

		const { tiles, overlayInfo } = this;

		// get the center of the content
		const box = new Box3();
		box.setFromObject( scene );
		box.getCenter( centerTarget );

		// find the vectors that are orthogonal to every overlay projection
		const splitDirections = [];
		const hashTokens = [];
		overlayInfo.forEach( ( { tileInfo }, overlay ) => {

			// if the tile has a render target associated with the overlay and the last level of detail
			// is not being displayed, yet, then we need to split
			const info = tileInfo.get( tile );
			if ( info && info.target && overlay.tiling.maxLevel > info.level ) {

				// get the vector representing the projection direction
				if ( overlay.frame ) {

					_normal.set( 0, 0, 1 ).transformDirection( overlay.frame );

				} else {

					tiles.ellipsoid.getPositionToNormal( centerTarget, _normal );
					if ( _normal.length() < 1e-6 ) {

						_normal.set( 1, 0, 0 );

					}

				}

				// dedupe vectors in the hash
				const token = `${ _normal.x.toFixed( 3 ) },${ _normal.y.toFixed( 3 ) },${ _normal.z.toFixed( 3 ) }_`;
				if ( ! hashTokens.includes( token ) ) {

					hashTokens.push( token );

				}

				// construct the orthogonal vectors
				const other = _vec.set( 0, 0, 1 );
				if ( Math.abs( _normal.dot( other ) ) > 1 - 1e-4 ) {

					other.set( 1, 0, 0 );

				}

				const ortho0 = new Vector3().crossVectors( _normal, other ).normalize();
				const ortho1 = new Vector3().crossVectors( _normal, ortho0 ).normalize();
				splitDirections.push( ortho0, ortho1 );

			}

		} );

		// Generate a reduced set of vectors by averages directions in a 45 degree cone so
		// we don't split unnecessarily
		const directions = [];
		while ( splitDirections.length !== 0 ) {

			const normalized = splitDirections.pop().clone();
			const average = normalized.clone();
			for ( let i = 0; i < splitDirections.length; i ++ ) {

				const dir = splitDirections[ i ];
				const dotProduct = normalized.dot( dir );
				if ( Math.abs( dotProduct ) > Math.cos( Math.PI / 8 ) ) {

					average.addScaledVector( dir, Math.sign( dotProduct ) );
					normalized.copy( average ).normalize();
					splitDirections.splice( i, 1 );
					i --;

				}

			}

			directions.push( average.normalize() );

		}

		return { directions, hash: hashTokens.join( '' ) };

	}

	async expandVirtualChildren( scene, tile ) {

		if ( tile.children.length !== 0 || this.enableTileSplitting === false ) {

			return;

		}

		// create a copy of the content to transform and split
		const clone = scene.clone();
		clone.updateMatrixWorld();

		// get the directions to split on
		const { directions, hash } = this._getSplitVectors( clone, tile, _center );
		tile[ SPLIT_HASH ] = hash;

		// if there are no directions to split on then exit early
		if ( directions.length === 0 ) {

			return;

		}

		// set up the splitter to ignore overlay uvs
		const clipper = new GeometryClipper();
		clipper.attributeList = key => ! /^layer_uv_\d+/.test( key );
		directions.map( splitDirection => {

			clipper.addSplitOperation( ( geometry, i0, i1, i2, barycoord, matrixWorld ) => {

				Triangle.getInterpolatedAttribute( geometry.attributes.position, i0, i1, i2, barycoord, _vec );
				return _vec.applyMatrix4( matrixWorld ).sub( _center ).dot( splitDirection );

			} );

		} );

		// run the clipping operations by performing every permutation of sides
		// defined by the split directions
		const children = [];
		clipper.forEachSplitPermutation( () => {

			// clip the object itself
			const result = clipper.clipObject( clone );

			// remove the parent transform because it will be multiplied back in after the fact
			result.matrix
				.premultiply( tile.cached.transformInverse )
				.decompose( result.position, result.quaternion, result.scale );

			// collect the meshes
			const meshes = [];
			result.traverse( c => {

				if ( c.isMesh ) {

					const material = c.material.clone();
					c.material = material;
					for ( const key in material ) {

						const value = material[ key ];
						if ( value && value.isTexture ) {

							if ( value.source.data instanceof ImageBitmap ) {

								// clone any image bitmap textures using canvas because if we share the texture then when
								// the clipped child is disposed then it will dispose of the parent tile texture data, as well.
								const canvas = document.createElement( 'canvas' );
								canvas.width = value.image.width;
								canvas.height = value.image.height;

								const ctx = canvas.getContext( '2d' );
								ctx.scale( 1, - 1 );
								ctx.drawImage( value.source.data, 0, 0, canvas.width, - canvas.height );

								const tex = new CanvasTexture( canvas );
								tex.mapping = value.mapping;
								tex.wrapS = value.wrapS;
								tex.wrapT = value.wrapT;
								tex.minFilter = value.minFilter;
								tex.magFilter = value.magFilter;
								tex.format = value.format;
								tex.type = value.type;
								tex.anisotropy = value.anisotropy;
								tex.colorSpace = value.colorSpace;
								tex.generateMipmaps = value.generateMipmaps;

								material[ key ] = tex;

							}

						}

					}

					meshes.push( c );

				}

			} );

			if ( meshes.length === 0 ) {

				return;

			}

			// generate a region bounding volume
			const boundingVolume = {};
			if ( tile.boundingVolume.region ) {

				// TODO: disabled because the bounding volume isn't precise for frustum culling at small scales
				// boundingVolume.region = getMeshesCartographicRange( meshes, this.tiles.ellipsoid ).region;

			}

			// create a sphere bounding volume
			if ( tile.boundingVolume.box || tile.boundingVolume.sphere || tile.boundingVolume.region ) {

				// TODO: we create a sphere even when a region is present because currently the handling of region volumes
				// is a bit flaky especially at small scales. OBBs are generated which can be imperfect resulting rays passing
				// through tiles. The same may be the case with frustum checks. In theory, though, we should not need a sphere
				// bounds if a region bounds are present.

				// compute the sphere center
				_box
					.setFromObject( result, true )
					.getCenter( _sphereCenter );

				// calculate the sq radius from all vertices
				let maxSqRadius = 0;
				result.traverse( c => {

					const geometry = c.geometry;
					if ( geometry ) {

						const position = geometry.attributes.position;
						for ( let i = 0, l = position.count; i < l; i ++ ) {

							const sqRadius = _vec
								.fromBufferAttribute( position, i )
								.applyMatrix4( c.matrixWorld )
								.distanceToSquared( _sphereCenter );

							maxSqRadius = Math.max( maxSqRadius, sqRadius );

						}

					}

				} );

				boundingVolume.sphere = [ ..._sphereCenter, Math.sqrt( maxSqRadius ) ];

			}

			children.push( {
				refine: 'REPLACE',
				geometricError: tile.geometricError * 0.5,
				boundingVolume: boundingVolume,
				content: { uri: './child.image_overlay_tile_split' },
				children: [],
				[ SPLIT_TILE_DATA ]: result,
			} );

		} );

		tile.children.push( ...children );

	}

	fetchData( uri, options ) {

		// if this is our custom url indicating a tile split then return fake response
		if ( /image_overlay_tile_split/.test( uri ) ) {

			return new ArrayBuffer();

		}

	}

	// public
	addOverlay( overlay, order = null ) {

		const { tiles, overlays, overlayInfo } = this;

		if ( order === null ) {

			// set the order to the next largest order value
			order = overlays.reduce( ( v, o ) => Math.max( v, o.order + 1 ), 0 );

		}

		const controller = new AbortController();
		overlays.push( overlay );
		overlayInfo.set( overlay, {
			order: order,
			uniforms: {},
			tileInfo: new Map(),
			controller: controller,
			frame: overlay.frame ? overlay.frame.clone() : null,
		} );

		if ( tiles !== null ) {

			this._initOverlay( overlay );

		}

	}

	setOverlayOrder( overlay, order ) {

		const index = this.overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			this.overlayInfo.get( overlay ).order = order;
			this._markNeedsUpdate();

		}

	}

	deleteOverlay( overlay, forceDispose = true ) {

		const { overlays, overlayInfo, processQueue } = this;
		const index = overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			const { tileInfo, controller } = overlayInfo.get( overlay );
			tileInfo.forEach( ( { meshInfo, target } ) => {

				if ( target !== null ) {

					target.dispose();

				}

				meshInfo.clear();

			} );

			tileInfo.clear();
			overlayInfo.delete( overlay );
			controller.abort();

			// Remove any items that reference the overlay being disposed
			processQueue.removeByFilter( item => {

				return item.overlay === overlay;

			} );

			overlays.splice( index, 1 );
			if ( forceDispose ) {

				overlay.dispose();

			}

			this._markNeedsUpdate();

		}

	}

	// internal
	_calculateLevelFromOverlay( overlay, range, tile, normalized = false ) {

		if ( overlay.isPlanarProjection ) {

			const { resolution } = this;
			const { tiling } = overlay;

			const normalizedRange = normalized ? range : tiling.toNormalizedRange( range );
			const [ minX, minY, maxX, maxY ] = normalizedRange;
			const w = maxX - minX;
			const h = maxY - minY;

			let level = 0;
			const { maxLevel } = tiling;
			for ( ; level < maxLevel; level ++ ) {

				// the number of pixels per image on each axis
				const wProj = resolution / w;
				const hProj = resolution / h;

				const { pixelWidth, pixelHeight } = tiling.getLevel( level );
				if ( pixelWidth >= wProj || pixelHeight >= hProj ) {

					break;

				}

			}

			// TODO: should this be one layer higher LoD?
			return level;

		} else {

			return tile.__depthFromRenderedParent - 1;

		}

	}

	// initialize the overlay to use the right fetch options, load all data for existing tiles
	_initOverlay( overlay ) {

		const { tiles } = this;
		overlay.imageSource.fetchOptions = tiles.fetchOptions;
		if ( ! overlay.isInitialized ) {

			overlay.imageSource.fetchData = ( ...args ) => tiles
				.downloadQueue
				.add( { priority: - performance.now() }, () => {

					return overlay.fetch( ...args );

				} );
			overlay.init();

		}

		const promises = [];
		const initTile = async ( scene, tile ) => {

			this._initTileOverlayInfo( tile, overlay );

			const promise = this._initTileSceneOverlayInfo( scene, tile, overlay );
			promises.push( promise );

			// mark tiles as needing an update after initialized so we get a trickle in of tiles
			await promise;
			this._updateLayers( tile );

		};

		tiles.forEachLoadedModel( initTile );
		this.pendingTiles.forEach( ( scene, tile ) => {

			initTile( scene, tile );

		} );

		Promise.all( promises ).then( () => {

			this._markNeedsUpdate();

		} );

	}

	// wrap all materials in the given scene wit the overlay material shader
	_wrapMaterials( scene ) {

		scene.traverse( c => {

			if ( c.material ) {

				const params = wrapOverlaysMaterial( c.material, c.material.onBeforeCompile );
				this.meshParams.set( c, params );

			}

		} );

	}

	// Initialize per-tile overlay information. This function triggers an async function but
	// does not need to be awaited for use since it's just locking textures which are awaited later.
	_initTileOverlayInfo( tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			overlay.forEach( o => this._initTileOverlayInfo( tile, o ) );
			return;

		}

		// This function is resilient to multiple calls in case an overlay is added after a tile starts loading
		// and before it is loaded, meaning this function needs to be called twice to ensure it's initialized.
		const { overlayInfo, processQueue } = this;
		if ( overlayInfo.get( overlay ).tileInfo.has( tile ) ) {

			return;

		}

		const level = tile.__depthFromRenderedParent - 1;
		const info = {
			range: null,
			meshRange: null,
			level: null,
			target: null,
			meshInfo: new Map(),

			rangeMarked: false,
			meshRangeMarked: false,
		};

		overlayInfo
			.get( overlay )
			.tileInfo
			.set( tile, info );

		if ( overlay.isPlanarProjection ) {

			// TODO: we could project the shape into the frame, compute 2d bounds, and then mark tiles

		} else {

			// If the tile has a region bounding volume then mark the tiles to preload
			if ( tile.boundingVolume.region ) {

				const [ minLon, minLat, maxLon, maxLat ] = tile.boundingVolume.region;
				const range = [ minLon, minLat, maxLon, maxLat ];
				info.range = range;
				info.level = this._calculateLevelFromOverlay( overlay, range, tile );

				processQueue
					.add( { tile, overlay }, () => {

						info.rangeMarked = true;
						return markOverlayImages( range, level, overlay, false );

					} )
					.catch( () => {

						// the queue throws an error if a task is removed early

					} );

			}

		}

	}

	// initialize the scene meshes
	async _initTileSceneOverlayInfo( scene, tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			return Promise.all( overlay.map( o => this._initTileSceneOverlayInfo( scene, tile, o ) ) );

		}

		const { tiles, overlayInfo, resolution, tileComposer, tileControllers, usedTextures, processQueue } = this;
		const { ellipsoid } = tiles;
		const { controller, tileInfo } = overlayInfo.get( overlay );
		const tileController = tileControllers.get( tile );

		// wait for the overlay to be completely loaded so projection and tiling are available
		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

		// check if the overlay or tile have been disposed since starting this function
		// if the tileController is not present then the tile has been disposed of already
		if ( controller.signal.aborted || tileController.signal.aborted ) {

			return;

		}

		// find all meshes to project on and ensure matrices are up to date
		const meshes = [];
		scene.updateMatrixWorld();
		scene.traverse( c => {

			if ( c.isMesh ) {

				meshes.push( c );

			}

		} );

		const { tiling, imageSource } = overlay;
		const info = tileInfo.get( tile );
		let range, uvs, heightInRange;

		// retrieve the uvs and range for all the meshes
		if ( overlay.isPlanarProjection ) {

			_matrix.copy( overlay.frame ).invert();
			if ( scene.parent !== null ) {

				_matrix.multiply( tiles.group.matrixWorldInverse );

			}

			let heightRange;
			( { range, uvs, heightRange } = getMeshesPlanarRange( meshes, _matrix, tiling ) );
			heightInRange = ! ( heightRange[ 0 ] > 1 || heightRange[ 1 ] < 0 );

		} else {

			_matrix.identity();
			if ( scene.parent !== null ) {

				_matrix.copy( tiles.group.matrixWorldInverse );

			}

			( { range, uvs } = getMeshesCartographicRange( meshes, ellipsoid, _matrix, tiling ) );
			heightInRange = true;

		}

		let normalizedRange;
		if ( ! overlay.isPlanarProjection ) {

			normalizedRange = tiling.toNormalizedRange( range );

		} else {

			normalizedRange = range;

		}

		// calculate the tiling level here if not already created
		if ( info.level === null ) {

			info.level = this._calculateLevelFromOverlay( overlay, normalizedRange, tile, true );

		}

		// if the image projection is outside the 0, 1 uvw range or there are no textures to draw in
		// the tiled image set the don't allocate a texture for it.
		let target = null;
		if ( heightInRange && countTilesInRange( range, info.level, overlay ) !== 0 ) {

			target = new WebGLRenderTarget( resolution, resolution, {
				depthBuffer: false,
				stencilBuffer: false,
				generateMipmaps: false,
				colorSpace: SRGBColorSpace,
			} );

		}

		info.meshRange = range;
		info.target = target;

		meshes.forEach( ( mesh, i ) => {

			const array = new Float32Array( uvs[ i ] );
			const attribute = new BufferAttribute( array, 3 );
			info.meshInfo.set( mesh, { attribute } );

		} );

		if ( target !== null ) {

			await processQueue
				.add( { tile, overlay }, async () => {

					info.meshRangeMarked = true;

					const promise = markOverlayImages( range, info.level, overlay, false );
					if ( promise ) {

						// if the previous layer is present then draw it as an overlay to fill in any gaps while we wait for
						// the next set of textures
						tileComposer.setRenderTarget( target, normalizedRange );
						tileComposer.clear( 0xffffff, 0 );

						forEachTileInBounds( range, info.level - 1, tiling, overlay.isPlanarProjection, ( tx, ty, tl ) => {

							// draw using normalized bounds since the mercator bounds are non-linear
							const span = tiling.getTileBounds( tx, ty, tl, true );
							const tex = imageSource.get( tx, ty, tl );
							if ( tex && ! ( tex instanceof Promise ) ) {

								tileComposer.draw( tex, span );
								usedTextures.add( tex );
								this._scheduleCleanup();

							}

						} );

						try {

							await promise;

						} catch ( e ) {

							// skip errors since this will throw when aborted
							return;

						}

					}

					// check if the overlay has been disposed since starting this function
					if ( controller.signal.aborted || tileController.signal.aborted ) {

						return;

					}

					// draw the textures
					tileComposer.setRenderTarget( target, normalizedRange );
					tileComposer.clear( 0xffffff, 0 );

					forEachTileInBounds( range, info.level, tiling, overlay.isPlanarProjection, ( tx, ty, tl ) => {

						// draw using normalized bounds since the mercator bounds are non-linear
						const span = tiling.getTileBounds( tx, ty, tl, true );
						const tex = imageSource.get( tx, ty, tl );
						tileComposer.draw( tex, span );
						usedTextures.add( tex );
						this._scheduleCleanup();

					} );

				} )
				.catch( () => {

					// the queue throws an error if a task is removed early

				} );

		}

	}

	_updateLayers( tile ) {

		const { overlayInfo, overlays, tileControllers } = this;
		const tileController = tileControllers.get( tile );

		// by this point all targets should be present and we can force the memory to update
		this.tiles.recalculateBytesUsed( tile );

		// if the tile has been disposed before this function is called then exit early
		if ( ! tileController || tileController.signal.aborted ) {

			return;

		}

		// update the uvs and texture overlays for each mesh
		overlays.forEach( ( overlay, i ) => {

			const { tileInfo } = overlayInfo.get( overlay );
			const { meshInfo, target } = tileInfo.get( tile );
			meshInfo.forEach( ( { attribute }, mesh ) => {

				const { geometry, material } = mesh;
				const params = this.meshParams.get( mesh );

				// assign the new uvs
				const key = `layer_uv_${ i }`;
				if ( geometry.getAttribute( key ) !== attribute ) {

					geometry.setAttribute( key, attribute );
					geometry.dispose();

				}

				// set the uniform array lengths
				params.layerMaps.length = overlays.length;
				params.layerColor.length = overlays.length;

				// assign the uniforms
				params.layerMaps.value[ i ] = target !== null ? target.texture : null;
				params.layerColor.value[ i ] = overlay;

				material.defines.LAYER_COUNT = overlays.length;
				material.needsUpdate = true;

			} );

		} );

	}

	_scheduleCleanup() {

		// clean up textures used for drawing the tile overlays
		if ( ! this._cleanupScheduled ) {

			this._cleanupScheduled = true;
			requestAnimationFrame( () => {

				const { usedTextures } = this;
				usedTextures.forEach( tex => {

					tex.dispose();

				} );

				usedTextures.clear();
				this._cleanupScheduled = false;

			} );

		}

	}

	_markNeedsUpdate() {

		if ( this.needsUpdate === false ) {

			this.needsUpdate = true;
			if ( this.tiles !== null ) {

				this.tiles.dispatchEvent( { type: 'needs-update' } );

			}

		}

	}

}

class ImageOverlay {

	get tiling() {

		return this.imageSource.tiling;

	}

	get projection() {

		return this.tiling.projection;

	}

	get isPlanarProjection() {

		return Boolean( this.frame );

	}

	get aspectRatio() {

		return this.tiling && this.isReady ? this.tiling.aspectRatio : 1;

	}

	constructor( options = {} ) {

		const {
			opacity = 1,
			color = 0xffffff,
			frame = null,
		} = options;
		this.imageSource = null;
		this.opacity = opacity;
		this.color = new Color( color );
		this.frame = frame !== null ? frame.clone() : null;
		this.isReady = false;
		this.isInitialized = false;

	}

	init() {

		this.isInitialized = true;
		this.whenReady().then( () => {

			this.isReady = true;

		} );

	}

	fetch( ...args ) {

		return fetch( ...args );

	}

	whenReady() {

	}

	getAttributions( target ) {

	}

	dispose() {

		this.imageSource.dispose();

	}

}

export class XYZTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new XYZImageSource( options );
		this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
		this.url = options.url;

	}

	init() {

		this._whenReady = this.imageSource.init( this.url );

		super.init();

	}

	whenReady() {

		return this._whenReady;

	}

}

export class TMSTilesOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new TMSImageSource( options );
		this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
		this.url = options.url;

	}

	init() {

		this._whenReady = this.imageSource.init( this.url );

		super.init();

	}

	whenReady() {

		return this._whenReady;

	}

}

export class CesiumIonOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );

		const { apiToken, autoRefreshToken, assetId } = options;
		this.assetId = assetId;
		this.auth = new CesiumIonAuth( { apiToken, autoRefreshToken } );
		this.imageSource = new TMSImageSource( options );

		this.auth.authURL = `https://api.cesium.com/v1/assets/${ assetId }/endpoint`;
		this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
		this._attributions = [];

	}

	init() {

		this._whenReady = this
			.auth
			.refreshToken()
			.then( json => {

				this._attributions = json.attributions.map( att => ( {
					value: att.html,
					type: 'html',
					collapsible: att.collapsible,
				} ) );
				return this.imageSource.init( json.url );

			} );

		super.init();

	}

	fetch( ...args ) {

		return this.auth.fetch( ...args );

	}

	whenReady() {

		return this._whenReady;

	}

	getAttributions( target ) {

		target.push( ...this._attributions );

	}

}

export class GoogleMapsOverlay extends ImageOverlay {

	constructor( options = {} ) {

		super( options );

		const { apiToken, sessionOptions, autoRefreshToken, logoUrl } = options;
		this.logoUrl = logoUrl;
		this.auth = new GoogleCloudAuth( { apiToken, sessionOptions, autoRefreshToken } );
		this.imageSource = new XYZImageSource();

		this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
		this._logoAttribution = {
			value: '',
			type: 'image',
			collapsible: false,
		};

	}

	init() {

		this._whenReady = this
			.auth
			.refreshToken()
			.then( json => {

				this.imageSource.tileDimension = json.tileWidth;
				return this.imageSource.init( 'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}' );

			} );

		super.init();

	}

	fetch( ...args ) {

		return this.auth.fetch( ...args );

	}

	whenReady() {

		return this._whenReady;

	}

	getAttributions( target ) {

		if ( this.logoUrl ) {

			this._logoAttribution.value = this.logoUrl;
			target.push( this._logoAttribution );

		}

	}

}
