import { WebGLRenderTarget, Color, SRGBColorSpace, BufferAttribute, Matrix4 } from 'three';
import { TiledTextureComposer } from './overlays/TiledTextureComposer.js';
import { XYZImageSource } from './sources/XYZImageSource.js';
import { TMSImageSource } from './sources/TMSImageSource.js';
import { forEachTileInBounds, getMeshesCartographicRange, getMeshesPlanarRange } from './overlays/utils.js';
import { CesiumIonAuth } from '../../core/auth/CesiumIonAuth.js';
import { PriorityQueue } from '../../../core/utilities/PriorityQueue.js';
import { wrapOverlaysMaterial } from './overlays/wrapOverlaysMaterial.js';
import { GoogleCloudAuth } from '../../core/auth/GoogleCloudAuth.js';
import { GeometryClipper } from '../utilities/GeometryClipper.js';

const _matrix = /* @__PURE__ */ new Matrix4();

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

	constructor( options = {} ) {

		const {
			overlays = [],
			resolution = 256,
			renderer = null,
		} = options;

		this.name = 'IMAGE_OVERLAY_PLUGIN';
		this.priority = 100;

		// options
		this.renderer = renderer;
		this.resolution = resolution;
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

		overlays.forEach( overlay => {

			this.addOverlay( overlay );

		} );

	}

	// plugin functions
	init( tiles ) {

		const tileComposer = new TiledTextureComposer( this.renderer );
		const processQueue = new PriorityQueue();
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

		const { overlayInfo, tileControllers, processQueue } = this;

		// Cancel any ongoing tasks. If a tile is cancelled while downloading
		// this will not have been created, yet.
		if ( tileControllers.has( tile ) ) {

			tileControllers.get( tile ).abort();
			tileControllers.delete( tile );

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

		} );

		tiles.removeEventListener( 'update-after', this._onUpdateAfter );

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

			// TODO: split on the given axes, keep the target model
			const clipper = new GeometryClipper();

		}

		// TODO: generate "virtual" nodes for the node if needed. Create a reusable function here since we
		// need to clean and recreate all the virtual children when the overlays change
		// TODO: handle disposal by checking if children are "virtual"

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

			overlay.init();

		}

		const promises = [];
		const initTile = async ( scene, tile ) => {

			this._initTileOverlayInfo( tile, overlay );

			const promise = this._initTileSceneOverlayInfo( scene, tile, overlay );
			promises.push( promise );

			// mark tiles as needing an update after initialized so we get a trickle in of tiles
			await promise;
			this._markNeedsUpdate();

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
		let range, uvs;

		// retrieve the uvs and range for all the meshes
		if ( overlay.isPlanarProjection ) {

			_matrix.copy( overlay.frame ).invert();
			if ( scene.parent !== null ) {

				_matrix.multiply( tiles.group.matrixWorldInverse );

			}

			( { range, uvs } = getMeshesPlanarRange( meshes, _matrix, tiling ) );

		} else {

			_matrix.identity();
			if ( scene.parent !== null ) {

				_matrix.copy( tiles.group.matrixWorldInverse );

			}

			( { range, uvs } = getMeshesCartographicRange( meshes, ellipsoid, _matrix, tiling ) );

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

		// if there are no textures to draw in the tiled image set the don't
		// allocate a texture for it.
		let target = null;
		if ( countTilesInRange( range, info.level, overlay ) !== 0 ) {

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
			const attribute = new BufferAttribute( array, 2 );
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

						await promise;

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
		this.imageSource.fetchData = ( ...args ) => this.auth.fetch( ...args );
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

		this.imageSource.fetchData = ( ...args ) => this.auth.fetch( ...args );
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
