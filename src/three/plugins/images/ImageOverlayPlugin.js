/** @import { WebGLRenderer } from 'three' */
import { Color, BufferAttribute, Matrix4, Vector3, Box3, Triangle, CanvasTexture } from 'three';
import { PriorityQueue, PriorityQueueItemRemovedError } from '3d-tiles-renderer/core';
import { CesiumIonAuth, GoogleCloudAuth } from '3d-tiles-renderer/core/plugins';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { QuadKeyImageSource } from './sources/QuadKeyImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { getMeshesCartographicRange, getMeshesPlanarRange } from './overlays/utils.js';
import { wrapOverlaysMaterial } from './overlays/wrapOverlaysMaterial.js';
import { GeometryClipper } from '../utilities/GeometryClipper.js';
import { WMTSImageSource } from './sources/WMTSImageSource.js';
import { MemoryUtils } from '3d-tiles-renderer/three';
import { GeoJSONImageSource } from './sources/GeoJSONImageSource.js';
import { WMSImageSource } from './sources/WMSImageSource.js';
import { TiledRegionImageSource } from './sources/RegionImageSource.js';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';

const _matrix = /* @__PURE__ */ new Matrix4();
const _vec = /* @__PURE__ */ new Vector3();
const _center = /* @__PURE__ */ new Vector3();
const _sphereCenter = /* @__PURE__ */ new Vector3();
const _normal = /* @__PURE__ */ new Vector3();
const _box = /* @__PURE__ */ new Box3();
const SPLIT_TILE_DATA = Symbol( 'SPLIT_TILE_DATA' );
const SPLIT_HASH = Symbol( 'SPLIT_HASH' );
const ORIGINAL_REFINE = Symbol( 'ORIGINAL_REFINE' );

/**
 * Plugin that composites one or more tiled image overlays onto 3D tile geometry by
 * generating per-tile textures from image sources (XYZ, TMS, WMTS, WMS, GeoJSON, etc.).
 * Image sources are added via `addOverlay()` and removed via `deleteOverlay()`.
 * @param {Object} [options]
 * @param {WebGLRenderer} options.renderer The renderer used for constructing and rendering to render targets.
 * @param {Array} [options.overlays=[]] Initial image overlay sources to add.
 * @param {number} [options.resolution=256] Resolution of each generated tile texture in pixels.
 * @param {boolean} [options.enableTileSplitting=true] Allow tiles to be split to match image tile boundaries.
 */
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
			enableTileSplitting = true,
		} = options;

		// plugin needs to run before other plugins that fetch data since content
		// is handled and loaded in a custom way
		this.name = 'IMAGE_OVERLAY_PLUGIN';
		this.priority = - 15;

		// options
		this.resolution = resolution;
		this._enableTileSplitting = enableTileSplitting;
		this.overlays = [];

		// internal
		this.needsUpdate = false;
		this.tiles = null;
		this.tileComposer = null;
		this.tileControllers = new Map();
		this.overlayInfo = new Map();
		this.meshParams = new WeakMap();
		this.pendingTiles = new Map();
		this.processedTiles = new Set();
		this.processQueue = null;
		this._onUpdateAfter = null;
		this._onTileDownloadStart = null;
		this._virtualChildResetId = 0;
		this._bytesUsed = new WeakMap();

		overlays.forEach( overlay => {

			this.addOverlay( overlay );

		} );

	}

	// plugin functions
	init( tiles ) {

		const tileComposer = new TiledTextureComposer();
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
					this.deleteOverlay( overlay );
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

				this.processedTiles.forEach( tile => {

					this._updateLayers( tile );

				} );

				this.resetVirtualChildren( ! this.enableTileSplitting );
				tiles.recalculateBytesUsed();

				tiles.dispatchEvent( { type: 'needs-rerender' } );

			}

		};

		this._onTileDownloadStart = ( { tile, url } ) => {

			// TODO: it's not super straight forward to detect whether a tile is "geometry" or not ahead of time. Checking
			// for "subtree" or "json" are good broad strokes but some cases will still be missed.
			if ( ! /\.json$/i.test( url ) && ! /\.subtree/i.test( url ) ) {

				this.processedTiles.add( tile );
				this._initTileOverlayInfo( tile );

			}

		};

		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-download-start', this._onTileDownloadStart );

		this.overlays.forEach( overlay => {

			this._initOverlay( overlay );

		} );

	}

	_removeVirtualChildren( tile ) {

		if ( ! ( ORIGINAL_REFINE in tile ) ) {

			return;

		}

		// remove the virtual children associated with the given tile
		const { tiles } = this;
		const { virtualChildCount } = tile.internal;
		const len = tile.children.length;
		const start = len - virtualChildCount;
		for ( let i = start; i < len; i ++ ) {

			const child = tile.children[ i ];
			tiles.processNodeQueue.remove( child );
			tiles.lruCache.remove( child );
			child.parent = null;

		}

		tile.children.length -= virtualChildCount;
		tile.internal.virtualChildCount = 0;
		tile.refine = tile[ ORIGINAL_REFINE ];
		delete tile[ ORIGINAL_REFINE ];
		delete tile[ SPLIT_HASH ];

	}

	disposeTile( tile ) {

		const { overlayInfo, tileControllers, processQueue, pendingTiles, processedTiles } = this;

		processedTiles.delete( tile );

		// remove any virtual children since they depend on this tile being loaded for regeneration.
		// they will be recreated with fresh split configuration when the tile is reloaded.
		this._removeVirtualChildren( tile );

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

				const { meshInfo, range } = tileInfo.get( tile );

				if ( range !== null ) {

					overlay.releaseTexture( range );

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
				bytes += MemoryUtils.getTextureByteLength( target );

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

		const { tileControllers, processedTiles, pendingTiles } = this;

		tileControllers.set( tile, new AbortController() );

		if ( ! initialization ) {

			// we save all these pending tiles so that they can be correctly initialized if an
			// overlay is added in the time between when this function starts and after the async
			// await call. Otherwise the tile could be missed. But if we're initializing the plugin
			// then we don't need to do this because the tiles are already included in the traversal.
			pendingTiles.set( tile, scene );

		}

		// track which tiles we have been processed and remove them in "disposeTile"
		processedTiles.add( tile );

		this._wrapMaterials( scene );
		this._initTileOverlayInfo( tile );
		await this._initTileSceneOverlayInfo( scene, tile );
		this.expandVirtualChildren( scene, tile );
		this._updateLayers( tile );

		pendingTiles.delete( tile );

	}

	dispose() {

		const { tiles } = this;

		// dispose of all overlays
		const overlays = [ ...this.overlays ];
		overlays.forEach( overlay => {

			this.deleteOverlay( overlay );

		} );

		// reset the textures of the meshes
		this.processedTiles.forEach( tile => {

			this._updateLayers( tile );
			this.disposeTile( tile );

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

		// collect the tiles split into virtual tiles, sorted deepest-first so nested virtual tiles
		// are cleaned up before their parents when iterating
		const { tiles } = this;
		const splitTiles = [];
		this.processedTiles.forEach( tile => {

			if ( SPLIT_HASH in tile ) {

				splitTiles.push( tile );

			}

		} );

		// ensure we clean depth first
		splitTiles.sort( ( a, b ) => b.internal.depth - a.internal.depth );

		// dispose of the virtual children if this tile would not be split or the split could change
		// under the current overlays used.
		splitTiles.forEach( tile => {

			const clone = tile.engineData.scene.clone();
			clone.updateMatrixWorld();

			if ( fullDispose || tile[ SPLIT_HASH ] !== this._getSplitVectors( clone, tile ).hash ) {

				// note that we need to remove children from the processing queue in this case
				// because we are forcibly evicting them from the cache. Since parents is sorted
				// deepest-first, nested virtual tiles are already cleaned up before we reach
				// their parent here.
				this._removeVirtualChildren( tile );

			}

		} );

		// re-expand tiles if needed
		if ( ! fullDispose ) {

			tiles.forEachLoadedModel( ( scene, tile ) => {

				this.expandVirtualChildren( scene, tile );

			} );

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
			if ( info && info.target && overlay.shouldSplit( info.range ) ) {

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

		const { refine } = tile;

		// Only split tiles that would benefit from it:
		// - REPLACE tiles with no children are leaf tiles where splitting improves overlay UV projection quality. REPLACE tiles
		// that already have children are already refined by their children so splitting is unnecessary.
		// - ADD tiles always need splitting since their content is rendered alongside children at all levels.
		// Also skip any tiles that already have virtual children to avoid interfering with other plugins.
		const shouldSplit = ( refine === 'REPLACE' && tile.children.length === 0 ) || refine === 'ADD';
		const alreadySplit = tile.internal.virtualChildCount !== 0;
		if ( this.enableTileSplitting === false || ! shouldSplit || alreadySplit ) {

			return;

		}

		// create a copy of the content to transform and split
		const clone = scene.clone();
		clone.updateMatrixWorld();

		// get the directions to split on & if there are no directions to split on then exit early
		const { directions, hash } = this._getSplitVectors( clone, tile, _center );
		if ( directions.length === 0 ) {

			return;

		}

		tile[ SPLIT_HASH ] = hash;

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
		const splitChildren = [];
		clipper.forEachSplitPermutation( () => {

			// clip the object itself
			const result = clipper.clipObject( clone );

			// remove the parent transform because it will be multiplied back in after the fact
			result.matrix
				.premultiply( tile.engineData.transformInverse )
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

				boundingVolume.region = getMeshesCartographicRange( meshes, this.tiles.ellipsoid ).region;

			}

			// create a sphere bounding volume
			if ( tile.boundingVolume.box || tile.boundingVolume.sphere ) {

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

			splitChildren.push( {
				internal: { isVirtual: true },
				refine: 'REPLACE',
				geometricError: tile.geometricError * 0.5,
				boundingVolume: boundingVolume,
				content: { uri: './child.image_overlay_tile_split' },
				children: [],
				[ SPLIT_TILE_DATA ]: result,
			} );

		} );

		// force the tile "refine" mode to be set to "REPLACE" so that the virtual children
		// replace this tile's geometry display. Save the original mode so it can be restored
		// if virtual children are later removed.
		tile[ ORIGINAL_REFINE ] = tile.refine;
		tile.refine = 'REPLACE';
		tile.children.push( ...splitChildren );
		tile.internal.virtualChildCount += splitChildren.length;

	}

	fetchData( uri, options ) {

		// if this is our custom url indicating a tile split then return fake response
		if ( /image_overlay_tile_split/.test( uri ) ) {

			return new ArrayBuffer();

		}

	}

	/**
	 * Adds an image overlay source to the plugin. The `order` parameter controls the draw
	 * order among overlays; lower values are drawn first. If omitted, the overlay is appended
	 * after all existing overlays.
	 * @param {ImageOverlay} overlay An image overlay instance.
	 * @param {number|null} [order=null] Draw order for this overlay.
	 */
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

	/**
	 * Updates the draw order for the given overlay.
	 * @param {ImageOverlay} overlay The overlay to reorder.
	 * @param {number} order New draw order value.
	 */
	setOverlayOrder( overlay, order ) {

		const index = this.overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			this.overlayInfo.get( overlay ).order = order;
			this._markNeedsUpdate();

		}

	}

	/**
	 * Removes the given overlay from the plugin.
	 * @param {ImageOverlay} overlay The overlay to remove.
	 */
	deleteOverlay( overlay ) {

		const { overlays, overlayInfo, processQueue, processedTiles } = this;
		const index = overlays.indexOf( overlay );
		if ( index !== - 1 ) {

			// delete tile info explicitly instead of blindly dispose of the full overlay
			const { tileInfo, controller } = overlayInfo.get( overlay );
			processedTiles.forEach( tile => {

				if ( ! tileInfo.has( tile ) ) {

					// check for the case where tiles have been added but not properly initialized with the
					// given overlay, yet
					return;

				}

				const {
					meshInfo,
					range,
				} = tileInfo.get( tile );

				// release the ranges
				if ( range !== null ) {

					overlay.releaseTexture( range );

				}

				tileInfo.delete( tile );
				meshInfo.clear();

			} );

			tileInfo.clear();
			overlayInfo.delete( overlay );
			controller.abort();

			// Remove any items that reference the overlay being disposed
			processQueue.removeByFilter( item => {

				return item.overlay === overlay;

			} );

			// remove the overlay
			overlays.splice( index, 1 );

			// update all tiles to truncate texture arrays and remove references immediately
			processedTiles.forEach( tile => {

				this._updateLayers( tile );

			} );

			this._markNeedsUpdate();

		}

	}

	// initialize the overlay to use the right fetch options, load all data for existing tiles
	_initOverlay( overlay ) {

		const { tiles } = this;

		overlay.init().then( () => {

			// Set resolution on the overlay
			overlay.setResolution( this.resolution );

			const overlayFetch = overlay.fetch.bind( overlay );
			overlay.fetch = ( ...args ) => tiles
				.downloadQueue
				.add( { priority: - performance.now() }, () => {

					return overlayFetch( ...args );

				} );

		} );

		const promises = [];
		const initTile = async ( scene, tile ) => {

			this._initTileOverlayInfo( tile, overlay );

			const promise = this._initTileSceneOverlayInfo( scene, tile, overlay );
			promises.push( promise );

			// mark tiles as needing an update after initialized so we get a trickle in of tiles
			await promise;
			this._updateLayers( tile );

		};

		tiles.forEachLoadedModel( ( scene, tile ) => {

			initTile( scene, tile );

		} );

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
		const { overlayInfo } = this;
		if ( overlayInfo.get( overlay ).tileInfo.has( tile ) ) {

			return;

		}

		const info = {
			range: null,
			target: null,
			meshInfo: new Map(),
		};

		overlayInfo
			.get( overlay )
			.tileInfo
			.set( tile, info );

		// if the overlay isn't ready then we can't convert the range correctly, yet
		if ( overlay.isReady ) {

			if ( overlay.isPlanarProjection ) {

				// TODO: we could project the shape into the frame, compute 2d bounds, and then mark tiles

			} else if ( tile.boundingVolume.region ) {

				// If the tile has a region bounding volume then mark the tiles to preload, clamped to the extents of
				// the overlay image
				const [ minLon, minLat, maxLon, maxLat ] = tile.boundingVolume.region;
				let range = [ minLon, minLat, maxLon, maxLat ];
				range = overlay.projection.clampToBounds( range );
				range = overlay.projection.toNormalizedRange( range );

				info.range = range;
				overlay.lockTexture( range );

			}

		}

	}

	// initialize the scene meshes
	async _initTileSceneOverlayInfo( scene, tile, overlay = this.overlays ) {

		if ( Array.isArray( overlay ) ) {

			return Promise.all( overlay.map( o => this._initTileSceneOverlayInfo( scene, tile, o ) ) );

		}

		const { tiles, overlayInfo, tileControllers, processQueue } = this;
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

		const { aspectRatio, projection } = overlay;
		const info = tileInfo.get( tile );
		let range, uvs, heightInRange;

		// retrieve the uvs and range for all the meshes
		if ( overlay.isPlanarProjection ) {

			// construct a matrix transforming _into_ the local frame in which the texture
			// will be sampled, scaling by the aspect ratio of the overlay so it is scaled
			// to [0, 1]
			_matrix
				.makeScale( 1 / aspectRatio, 1, 1 )
				.multiply( overlay.frame );

			if ( scene.parent !== null ) {

				_matrix.multiply( tiles.group.matrixWorldInverse );

			}

			let heightRange;
			( { range, uvs, heightRange } = getMeshesPlanarRange( meshes, _matrix ) );
			heightInRange = ! ( heightRange[ 0 ] > 1 || heightRange[ 1 ] < 0 );

		} else {

			_matrix.identity();
			if ( scene.parent !== null ) {

				_matrix.copy( tiles.group.matrixWorldInverse );

			}

			( { range, uvs } = getMeshesCartographicRange( meshes, ellipsoid, _matrix, projection, info.range ) );
			heightInRange = true;

		}

		// calculate the tiling level here if not already created
		if ( info.range === null ) {

			info.range = range;
			overlay.lockTexture( range );

		}

		// if the image projection is outside the 0, 1 uvw range or there are no textures to draw in
		// the tiled image set the don't allocate a texture for it.
		let target = null;
		if ( heightInRange && overlay.hasContent( range ) ) {

			target = await processQueue
				.add( { tile, overlay }, async () => {

					// check if the overlay has been disposed since starting this function
					if ( controller.signal.aborted || tileController.signal.aborted ) {

						return null;

					}

					// Get the texture from the overlay
					const regionTarget = await overlay.getTexture( range );

					// check if the overlay has been disposed since starting this function
					if ( controller.signal.aborted || tileController.signal.aborted ) {

						return null;

					}

					return regionTarget;

				} )
				.catch( err => {

					if ( ! ( err instanceof PriorityQueueItemRemovedError ) ) {

						throw err;

					}

				} );

		}

		info.target = target;

		meshes.forEach( ( mesh, i ) => {

			const array = new Float32Array( uvs[ i ] );
			const attribute = new BufferAttribute( array, 3 );
			info.meshInfo.set( mesh, { attribute } );

		} );

	}

	_updateLayers( tile ) {

		const { overlayInfo, overlays, tileControllers, meshParams } = this;
		const tileController = tileControllers.get( tile );

		// by this point all targets should be present and we can force the memory to update
		this.tiles.recalculateBytesUsed( tile );

		// if the tile has been disposed before this function is called then exit early
		if ( ! tileController || tileController.signal.aborted ) {

			return;

		}

		// handle the case where all overlays have been removed - we need to reset
		// the materials to have no layers
		if ( overlays.length === 0 ) {

			const scene = tile.engineData && tile.engineData.scene;
			if ( scene ) {

				scene.traverse( c => {

					if ( c.material && meshParams.has( c ) ) {

						const params = meshParams.get( c );
						params.layerMaps.length = 0;
						params.layerInfo.length = 0;

						c.material.defines.LAYER_COUNT = 0;
						c.material.needsUpdate = true;

					}

				} );

			}

			return;

		}

		// update the uvs and texture overlays for each mesh
		overlays.forEach( ( overlay, i ) => {

			const { tileInfo } = overlayInfo.get( overlay );
			const { meshInfo, target } = tileInfo.get( tile );
			meshInfo.forEach( ( { attribute }, mesh ) => {

				const { geometry, material } = mesh;
				const params = meshParams.get( mesh );

				// assign the new uvs
				const key = `layer_uv_${ i }`;
				if ( geometry.getAttribute( key ) !== attribute ) {

					geometry.setAttribute( key, attribute );
					geometry.dispose();

				}

				// set the uniform array lengths
				params.layerMaps.length = overlays.length;
				params.layerInfo.length = overlays.length;

				// assign the uniforms
				params.layerMaps.value[ i ] = target !== null ? target : null;
				params.layerInfo.value[ i ] = overlay;

				// mark per-layer defines
				material.defines[ `LAYER_${ i }_EXISTS` ] = Number( target !== null );
				material.defines[ `LAYER_${ i }_ALPHA_INVERT` ] = Number( overlay.alphaInvert );
				material.defines[ `LAYER_${ i }_ALPHA_MASK` ] = Number( overlay.alphaMask );

				material.defines.LAYER_COUNT = overlays.length;
				material.needsUpdate = true;

			} );

		} );

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

/**
 * Base class for all image overlays. Provides the interface that `ImageOverlayPlugin` uses to
 * fetch, lock, and release overlay textures.
 * @param {Object} [options]
 * @param {number} [options.opacity=1] Opacity of the overlay layer (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color multiplied with the overlay texture.
 * @param {Matrix4} [options.frame=null] World-space transform defining the plane for planar
 * projection. If null, cartographic (lat/lon) projection is used instead.
 * @param {Function} [options.preprocessURL=null] Optional function `(url) => url` called before
 * every fetch to allow URL rewriting or token injection.
 * @param {boolean} [options.alphaMask=false] If true, the overlay alpha channel masks the
 * underlying tile surface rather than blending on top of it.
 * @param {boolean} [options.alphaInvert=false] If true, inverts the alpha channel before
 * applying the mask or blend.
 */
class ImageOverlay {

	get isPlanarProjection() {

		return Boolean( this.frame );

	}

	constructor( options = {} ) {

		const {
			opacity = 1,
			color = 0xffffff,
			frame = null,
			preprocessURL = null,
			alphaMask = false,
			alphaInvert = false,
		} = options;
		this.preprocessURL = preprocessURL;
		this.opacity = opacity;
		this.color = new Color( color );
		this.frame = frame !== null ? frame.clone() : null;
		this.alphaMask = alphaMask;
		this.alphaInvert = alphaInvert;

		this._whenReady = null;
		this.isReady = false;
		this.isInitialized = false;

	}

	init() {

		if ( ! this.isInitialized ) {

			this.isInitialized = true;
			this._whenReady = this._init().then( () => this.isReady = true );

		}

		return this._whenReady;

	}

	whenReady() {

		return this._whenReady;

	}

	// overrideable
	_init() {

		return Promise.resolve();

	}

	fetch( url, options = {} ) {

		if ( this.preprocessURL ) {

			url = this.preprocessURL( url );

		}

		return fetch( url, options );

	}

	getAttributions( target ) {

	}

	hasContent( range ) {

		return false;

	}

	async getTexture( range ) {

		return null;

	}

	async lockTexture( range ) {

		return null;

	}

	releaseTexture( range ) {

	}

	setResolution( resolution ) {

	}

	shouldSplit( range ) {

		return false;

	}

}

/**
 * Base class for overlays backed by a tiled image source (XYZ, TMS, WMS, WMTS, etc.).
 * Manages a `TiledImageSource` and a `RegionImageSource` that handles compositing
 * multiple source tiles into a single texture per 3D tile region.
 * @extends ImageOverlay
 */
class TiledImageOverlay extends ImageOverlay {

	get tiling() {

		return this.imageSource.tiling;

	}

	get projection() {

		return this.tiling.projection;

	}

	get aspectRatio() {

		return this.tiling && this.isReady ? this.tiling.aspectRatio : 1;

	}

	get fetchOptions() {

		return this.imageSource.fetchOptions;

	}

	set fetchOptions( v ) {

		this.imageSource.fetchOptions = v;

	}

	constructor( options = {} ) {

		const { imageSource = null, ...rest } = options;
		super( rest );
		this.imageSource = imageSource;
		this.regionImageSource = null;

	}

	_init() {

		return this
			._initImageSource()
			.then( () => {

				this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
				this.regionImageSource = new TiledRegionImageSource( this.imageSource );

			} );

	}

	_initImageSource() {

		return this.imageSource.init();

	}

	// Texture acquisition API implementations
	calculateLevel( range ) {

		const [ minX, minY, maxX, maxY ] = range;
		const w = maxX - minX;
		const h = maxY - minY;

		let level = 0;
		const resolution = this.regionImageSource.resolution;
		const maxLevel = this.tiling.maxLevel;
		for ( ; level < maxLevel; level ++ ) {

			// the number of pixels per image on each axis
			const wProj = resolution / w;
			const hProj = resolution / h;

			const { pixelWidth, pixelHeight } = this.tiling.getLevel( level );
			if ( pixelWidth >= wProj || pixelHeight >= hProj ) {

				break;

			}

		}

		// TODO: should this be one layer higher LoD?
		return level;

	}

	hasContent( range ) {

		return this.regionImageSource.hasContent( ...range, this.calculateLevel( range ) );

	}

	getTexture( range ) {

		return this.regionImageSource.get( ...range, this.calculateLevel( range ) );

	}

	lockTexture( range ) {

		return this.regionImageSource.lock( ...range, this.calculateLevel( range ) );

	}

	releaseTexture( range ) {

		this.regionImageSource.release( ...range, this.calculateLevel( range ) );

	}

	setResolution( resolution ) {

		this.regionImageSource.resolution = resolution;

	}

	shouldSplit( range ) {

		// if we haven't reached the max level yet then continue splitting
		return this.tiling.maxLevel > this.calculateLevel( range );

	}

}

/**
 * Overlay that renders XYZ/Slippy-map image tiles (e.g. OpenStreetMap) on top of 3D tile
 * geometry. See the {@link https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames Slippy map tilenames specification}.
 * @extends TiledImageOverlay
 * @param {Object} [options]
 * @param {string} [options.url] URL template with `{x}`, `{y}`, `{z}` placeholders.
 * @param {number} [options.levels=20] Number of zoom levels.
 * @param {number} [options.tileDimension=256] Tile pixel size.
 * @param {string} [options.projection='EPSG:3857'] Projection scheme identifier.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class XYZTilesOverlay extends TiledImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new XYZImageSource( options );

	}

}

/**
 * Overlay that rasterizes a GeoJSON dataset onto 3D tile geometry. Features are drawn using the
 * Canvas 2D API at the tile's native resolution. Per-feature style overrides can be provided via
 * the `strokeStyle`, `fillStyle`, `strokeWidth`, and `pointRadius` properties on each GeoJSON
 * feature's `properties` object.
 * @extends ImageOverlay
 * @param {Object} [options]
 * @param {Object} [options.geojson=null] GeoJSON FeatureCollection or Feature object to render.
 * If not provided, `url` must be set so the data can be fetched on init.
 * @param {string} [options.url=null] URL to a GeoJSON file to fetch on initialization (used when
 * `geojson` is not supplied directly).
 * @param {number} [options.resolution=256] Canvas resolution (pixels) used when compositing tiles.
 * @param {number} [options.pointRadius=6] Radius in pixels used to render Point features.
 * @param {string} [options.strokeStyle='white'] Canvas stroke style for feature outlines.
 * @param {number} [options.strokeWidth=2] Stroke line width in pixels.
 * @param {string} [options.fillStyle='rgba( 255, 255, 255, 0.5 )'] Canvas fill style for feature interiors.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class GeoJSONOverlay extends ImageOverlay {

	get projection() {

		return this.imageSource.projection;

	}

	get aspectRatio() {

		return 2;

	}

	get pointRadius() {

		return this.imageSource.pointRadius;

	}

	set pointRadius( v ) {

		this.imageSource.pointRadius = v;

	}

	get strokeStyle() {

		return this.imageSource.strokeStyle;

	}

	set strokeStyle( v ) {

		this.imageSource.strokeStyle = v;

	}

	get strokeWidth() {

		return this.imageSource.strokeWidth;

	}

	set strokeWidth( v ) {

		this.imageSource.strokeWidth = v;

	}

	get fillStyle() {

		return this.imageSource.fillStyle;

	}

	set fillStyle( v ) {

		this.imageSource.fillStyle = v;

	}

	get geojson() {

		return this.imageSource.geojson;

	}

	set geojson( v ) {

		this.imageSource.geojson = v;

	}

	constructor( options = {} ) {

		super( options );
		this.imageSource = new GeoJSONImageSource( options );

	}

	_init() {

		return this.imageSource.init();

	}

	hasContent( range ) {

		return this.imageSource.hasContent( ...range );

	}

	getTexture( range ) {

		return this.imageSource.get( ...range );

	}

	lockTexture( range ) {

		return this.imageSource.lock( ...range );

	}

	releaseTexture( range ) {

		this.imageSource.release( ...range );

	}

	setResolution( resolution ) {

		this.imageSource.resolution = resolution;

	}

	shouldSplit( range ) {

		// geojson can always split
		return true;

	}

	redraw() {

		this.imageSource.redraw();

	}

}

/**
 * Overlay that renders WMS (Web Map Service) image tiles on top of 3D tile geometry.
 * See the {@link https://www.ogc.org/standard/wms/ WMS specification}.
 * @extends TiledImageOverlay
 * @param {Object} [options]
 * @param {string} [options.url] WMS base URL.
 * @param {string} [options.layer] WMS layer name.
 * @param {string} [options.crs] Coordinate reference system, e.g. `'EPSG:4326'`.
 * @param {string} [options.format] Image MIME type, e.g. `'image/png'`.
 * @param {number} [options.tileDimension=256] Tile pixel size.
 * @param {string} [options.styles] WMS styles parameter.
 * @param {string} [options.version] WMS version string, e.g. `'1.3.0'`.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class WMSTilesOverlay extends TiledImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new WMSImageSource( options );

	}

}

/**
 * Overlay that renders WMTS (Web Map Tile Service) image tiles on top of 3D tile geometry.
 * Pass a parsed capabilities object from `WMTSCapabilitiesLoader` or provide a URL template
 * directly. See the {@link https://www.ogc.org/standard/wmts/ WMTS specification}.
 * @extends TiledImageOverlay
 * @param {Object} [options]
 * @param {Object} [options.capabilities] Parsed WMTS capabilities from `WMTSCapabilitiesLoader`.
 * @param {string} [options.layer] WMTS layer identifier.
 * @param {string} [options.tileMatrixSet] Tile matrix set identifier.
 * @param {string} [options.style] Style identifier.
 * @param {Object} [options.dimensions] Additional WMTS dimension parameters.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class WMTSTilesOverlay extends TiledImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new WMTSImageSource( options );

	}

}

/**
 * Overlay that renders TMS (Tile Map Service) image tiles on top of 3D tile geometry.
 * See the {@link https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification TMS specification}.
 * @extends TiledImageOverlay
 * @param {Object} [options]
 * @param {string} [options.url] URL to the TMS `tilemapresource.xml` descriptor or tile template.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class TMSTilesOverlay extends TiledImageOverlay {

	constructor( options = {} ) {

		super( options );
		this.imageSource = new TMSImageSource( options );

	}

}

/**
 * Overlay that streams imagery from a Cesium Ion asset. Supports Ion-hosted TMS assets as well
 * as external asset types (Google 2D Maps, Bing Maps) that Ion proxies.
 * @extends TiledImageOverlay
 * @param {Object} [options]
 * @param {string} [options.apiToken] Cesium Ion API token for authentication.
 * @param {number} [options.assetId] Cesium Ion asset ID.
 * @param {boolean} [options.autoRefreshToken=false] Automatically refresh the auth token before
 * it expires.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class CesiumIonOverlay extends TiledImageOverlay {

	constructor( options = {} ) {

		super( options );

		const { apiToken, autoRefreshToken, assetId } = options;
		this.options = options;
		this.assetId = assetId;
		this.auth = new CesiumIonAuth( { apiToken, autoRefreshToken } );

		this.auth.authURL = `https://api.cesium.com/v1/assets/${ assetId }/endpoint`;
		this._attributions = [];

		this.externalType = false;

	}

	_initImageSource() {

		return this
			.auth
			.refreshToken()
			.then( async ( json ) => {

				this._attributions = json.attributions.map( att => ( {
					value: att.html,
					type: 'html',
					collapsible: att.collapsible,
				} ) );

				if ( json.type !== 'IMAGERY' ) {

					throw new Error( 'CesiumIonOverlay: Only IMAGERY is supported as overlay type.' );

				}

				this.externalType = Boolean( json.externalType );

				switch ( json.externalType ) {

					case 'GOOGLE_2D_MAPS': {

						const { url, session, key, tileWidth } = json.options;
						const xyzUrl = `${ url }/v1/2dtiles/{z}/{x}/{y}?session=${ session }&key=${ key }`;
						this.imageSource = new XYZImageSource( {
							...this.options,
							url: xyzUrl,
							tileDimension: tileWidth,

							// Google maps tiles have a fixed depth of 22
							// https://developers.google.com/maps/documentation/tile/2d-tiles-overview
							levels: 22,
						} );
						break;

					}

					case 'BING': {

						const { url, mapStyle, key } = json.options;
						const metadataUrl = `${ url }/REST/v1/Imagery/Metadata/${ mapStyle }?incl=ImageryProviders&key=${ key }&uriScheme=https`;
						const response = await fetch( metadataUrl ).then( res => res.json() );
						const metadata = response.resourceSets[ 0 ].resources[ 0 ];

						this.imageSource = new QuadKeyImageSource( {
							...this.options,
							url: metadata.imageUrl,
							subdomains: metadata.imageUrlSubdomains,
							tileDimension: metadata.tileWidth,
							levels: metadata.zoomMax,
						} );
						break;

					}

					default:
						this.imageSource = new TMSImageSource( {
							...this.options,
							url: json.url,
						} );

				}

				this.imageSource.fetchData = ( ...args ) => this.fetch( ...args );
				return this.imageSource.init();

			} );

	}

	fetch( ...args ) {

		// bypass auth fetch if asset is external type to prevent CORS error due to wrong bearer token
		return this.externalType ? super.fetch( ...args ) : this.auth.fetch( ...args );

	}

	getAttributions( target ) {

		target.push( ...this._attributions );

	}

}

/**
 * Overlay that streams Google Maps 2D tile imagery on top of 3D tile geometry using the
 * Google Maps Tile API.
 * @extends TiledImageOverlay
 * @param {Object} [options]
 * @param {string} [options.apiToken] Google Maps API key.
 * @param {Object} [options.sessionOptions] Session creation options passed to the Google Maps
 * Tile API when establishing a tile session.
 * @param {boolean} [options.autoRefreshToken=false] Automatically refresh the session token
 * before it expires.
 * @param {string} [options.logoUrl=null] URL to a Google logo image. If provided, it is included
 * in the overlay attributions as required by Google's terms of service.
 * @param {number} [options.opacity=1] Overlay opacity (0–1).
 * @param {number|Color} [options.color=0xffffff] Tint color.
 * @param {Matrix4} [options.frame=null] Planar projection frame. If null, cartographic projection is used.
 * @param {Function} [options.preprocessURL=null] URL rewriting callback.
 * @param {boolean} [options.alphaMask=false] Use alpha channel as a surface mask.
 * @param {boolean} [options.alphaInvert=false] Invert the alpha channel.
 */
export class GoogleMapsOverlay extends TiledImageOverlay {

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

	_initImageSource() {

		return this
			.auth
			.refreshToken()
			.then( json => {

				this.imageSource.tileDimension = json.tileWidth;
				this.imageSource.url = 'https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}';
				return this.imageSource.init();

			} );

	}

	fetch( ...args ) {

		return this.auth.fetch( ...args );

	}

	getAttributions( target ) {

		if ( this.logoUrl ) {

			this._logoAttribution.value = this.logoUrl;
			target.push( this._logoAttribution );

		}

	}

}
