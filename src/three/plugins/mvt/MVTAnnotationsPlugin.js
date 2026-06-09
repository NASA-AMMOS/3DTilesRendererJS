/** @import { Camera, Scene } from 'three' */
import { Frustum, MathUtils, Matrix4, Raycaster } from 'three';
import { HierarchicalLock } from './HierarchicalLock.js';
import { PointAnnotationItem } from './ScreenOccupationManager.js';
import { DelayedScreenOccupationManager } from './DelayedScreenOccupationManager.js';
import { forEachTileInBounds, getMeshesCartographicRange } from '../images/overlays/utils.js';

const PARALLEL_EPSILON = 1e-10;

const _matrix = /* @__PURE__ */ new Matrix4();
const _ndcMatrix = /* @__PURE__ */ new Matrix4();
const _raycaster = /* @__PURE__ */ new Raycaster();
const _frustum = /* @__PURE__ */ new Frustum();
const _intersectingFrustum = new Set();

// provide all meshes in the scene
function collectMeshes( object ) {

	const meshes = [];
	object.traverse( c => {

		if ( c.isMesh ) {

			meshes.push( c );

		}

	} );

	return meshes;

}

// check if the given raycaster intersects the provided frustum shape
function rayIntersectsFrustum( raycaster, frustum ) {

	// TODO: this function has some false positives and could be improved
	const { ray } = raycaster;
	const { planes } = frustum;
	let t0 = 0;
	let t1 = raycaster.far;

	for ( let i = 0; i < 6; i ++ ) {

		const plane = planes[ i ];

		// positive plane normal points _inside_ the frustum
		const denom = plane.normal.dot( ray.direction );

		if ( Math.abs( denom ) < PARALLEL_EPSILON ) {

			// parallel to the plane — if origin is outside, the ray never enters
			if ( plane.distanceToPoint( ray.origin ) < 0 ) {

				return false;

			}

		} else {

			const t = ray.distanceToPlane( plane );
			if ( denom > 0 ) {

				// entering plane: null means entry is behind the ray origin, no constraint
				if ( t !== null && t > t0 ) {

					t0 = t;

				}

			} else {

				// exiting plane: null means we already exited before the ray origin
				if ( t === null ) {

					return false;

				}

				if ( t < t1 ) {

					t1 = t;

				}

			}

			if ( t0 > t1 ) {

				return false;

			}

		}

	}

	return true;

}

/**
 * @callback GetAnnotationCallback
 * @param {string} layerName - The MVT layer name the feature belongs to.
 * @param {Object} properties - The feature's property map.
 * @returns {boolean} Return true to include this feature as an annotation.
 */

/**
 * @callback AnnotationsUpdateCallback
 * @param {Set} added - `PointAnnotationItem` instances that became visible this frame.
 * @param {Set} removed - `PointAnnotationItem` instances that became hidden this frame.
 */

/**
 * Plugin that extracts point features from an MVT overlay and manages their screen-space
 * occupation, preventing label crowding via a hierarchical lock system and raycasted depth
 * placement. Rendering is left entirely to the caller via `onAnnotationsUpdate`.
 * @param {Object} options
 * @param {Object} options.overlay - The `PMTilesOverlay` (or compatible overlay) whose tile
 *   content is parsed for point features.
 * @param {Camera} [options.camera=null] - Initial camera. Can be updated with `setCamera()`.
 * @param {Scene} [options.scene=null] - Three.js scene reference (stored for caller use).
 * @param {boolean} [options.displayOccupancyGrid=false] - Overlay a debug canvas showing the
 *   screen-space occupation grid.
 */
export class MVTAnnotationsPlugin {

	get contentCache() {

		return this.overlay.imageSource._contentCache;

	}

	constructor( options = {} ) {

		// plugin fields
		this.priority = Infinity;
		this.name = 'MVT_ANNOTATIONS_PLUGIN';

		const {
			overlay,
			sortCallback = ( a, b ) => {

				const rankA = a.properties[ 'rank' ] ?? 1e10;
				const rankB = b.properties[ 'rank' ] ?? 1e10;
				return rankA - rankB;

			},
			filterAnnotation = () => false,
			onAnnotationsUpdate = () => {},
			camera = null,
			displayOccupancyGrid = false,
		} = options;

		this.overlay = overlay;

		// locks for tiles and screen occupancy
		this.locks = new HierarchicalLock();
		this.occupancy = new DelayedScreenOccupationManager();

		// save the camera used for positioning icons
		this.camera = camera;

		// set of tile info (eg range, etc) and annotations associated with each tile
		this.tileLoadState = new Map();
		this.mvtTileItems = new Map();

		// callback to filter which features become annotations:
		this.sortCallback = sortCallback;
		this.filterAnnotation = filterAnnotation;
		this.onAnnotationsUpdate = onAnnotationsUpdate;
		this.displayOccupancyGrid = displayOccupancyGrid;

		// raycast parameters
		this._settlingQueue = [];
		this._settlingQueueSet = new Set();
		this._settlingNeedsRebuild = false;
		this.maxSettleTimeMs = 5;

		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations
		// TODO: debounce occupancy decisions — wait N frames before dispatching "added" / "removed"
		//       so transient conflicts (camera micro-movement) don't cause visible flicker

	}

	init( tiles ) {

		const { locks, overlay, occupancy, tileLoadState } = this;

		// init container
		this.tiles = tiles;

		// ensure the overlay is initialized
		overlay.init();

		this._onTileDownloadStart = ( { tile } ) => {

			const info = {
				range: null,
				loaded: false,
				disposed: false,
			};

			tileLoadState.set( tile, info );

			if ( overlay.isReady && tile.boundingVolume.region ) {

				// If the tile has a region bounding volume then mark the tiles to preload, clamped to the extents of
				// the overlay image
				const [ minLon, minLat, maxLon, maxLat ] = tile.boundingVolume.region;
				let range = [ minLon, minLat, maxLon, maxLat ];
				range = overlay.projection.clampToBounds( range );
				range = overlay.projection.toNormalizedRange( range );

				info.range = range;

				// TODO: we need to avoid double locking here and below with no synchronized release
				// const { contentCache } = this;
				// this._forEachTileInBounds( range, ( x, y, l ) => {

				// 	// lock MVT content in a 2x2 pattern
				// 	contentCache.lock( x, y, l );

				// } );

			}

		};

		// event callbacks
		this._onVisibilityChange = ( { tile, visible } ) => {

			const info = tileLoadState.get( tile );

			// tile geometry changed — existing items may have been settled on this geometry
			// and need to be re-raycasted against the updated scene
			this._settlingNeedsRebuild = true;

			// TODO: the ImageOverlay Tile Splits is causing an issue here.
			if ( ! info ) {

				return;

			}

			const { loaded, range } = info;
			if ( loaded ) {

				this._forEachTileInBounds( range, ( x, y, l ) => {

					if ( visible ) {

						locks.markActive( x, y, l );

					} else {

						locks.markInactive( x, y, l );

					}

				} );

			}

		};

		occupancy.sortCallback = ( a, b ) => {

			// visibility is prioritized first
			const aVis = occupancy.visible.has( a );
			const bVis = occupancy.visible.has( b );
			if ( aVis !== bVis ) {

				return aVis ? - 1 : 1;

			}

			const sort = this.sortCallback( a, b );
			if ( sort !== 0 ) {

				// user sort
				return sort;

			} else if ( a.lodLevel !== b.lodLevel ) {

				// lod sort
				return b.lodLevel - a.lodLevel;

			}

			// if both items have been around for awhile (5 seconds) then just
			// just fall through to other sort mechanisms.
			const shortDuration = a.visibleDuration < 5000 || b.visibleDuration < 5000;
			if ( aVis && shortDuration && a.visibleTime !== b.visibleTime ) {

				// persistence sort for visual stability
				return a.visibleTime < b.visibleTime ? - 1 : 1;

			} else if ( b._screenPos.y !== a._screenPos.y ) {

				// distance up the screen
				return b._screenPos.y - a._screenPos.y;

			} else {

				return a.id > b.id ? 1 : - 1;

			}

		};


		this._onUpdateAfter = () => {

			// sync camera and localToWorld matrix into occupancy grid
			if ( this.camera !== null ) {

				tiles.getResolution( this.camera, occupancy.resolution );
				occupancy.camera = this.camera;
				occupancy.matrix.copy( tiles.group.matrixWorld );

			} else {

				occupancy.camera = null;

			}

			if ( this._settlingNeedsRebuild ) {

				this._settlingNeedsRebuild = false;
				this._enqueueSettlingAll();

			}

			this._processSettling();
			occupancy.update();
			this.onAnnotationsUpdate( occupancy.added, occupancy.removed );
			this._updateDebugGrid();

			if ( occupancy.added.size > 0 || occupancy.removed.size > 0 ) {

				tiles.dispatchEvent( { type: 'needs-render' } );

			}

			if ( occupancy.hasPendingWork || this._settlingQueue.length > 0 ) {

				tiles.dispatchEvent( { type: 'needs-update' } );

			}

		};

		this._onLockToggle = ( { x, y, level, active } ) => {

			tiles.dispatchEvent( { type: 'needs-update' } );

			const key = `${ x }_${ y }_${ level }`;

			if ( active ) {

				const { contentCache, occupancy, filterAnnotation, mvtTileItems } = this;
				const { tiling } = overlay;
				const vectorTile = contentCache.get( x, y, level );
				if ( ! vectorTile ) {

					return;

				}

				// get the normalized tile bound
				const tileBounds = tiling.getTileBounds( x, y, level, true, false );
				const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
				const items = [];

				// iterate over all the layers
				for ( const layerName in vectorTile.layers ) {

					const layer = vectorTile.layers[ layerName ];
					const extent = layer.extent;

					for ( let i = 0; i < layer.length; i ++ ) {

						// process only points
						const feature = layer.feature( i );
						if ( feature.type !== 1 ) {

							continue;

						}

						if ( filterAnnotation !== null && ! filterAnnotation( layerName, feature.properties ) ) {

							continue;

						}

						// retrieve the geometry
						const geometry = feature.loadGeometry();
						for ( const [ point ] of geometry ) {

							const u = MathUtils.lerp( tMinX, tMaxX, point.x / extent );
							// tile Y=0 is geographic north; with flipY the V axis increases northward
							// so we invert vf when flipY is set
							const vf = point.y / extent;
							const v = tiling.flipY
								? MathUtils.lerp( tMaxY, tMinY, vf )
								: MathUtils.lerp( tMinY, tMaxY, vf );

							const [ lon, lat ] = tiling.toCartographicPoint( u, v );

							const item = new PointAnnotationItem();
							// feature.id is the OSM element ID (node/way/relation) preserved by Planetiler
							// across all zoom levels — stable and unique for cross-LoD annotation replacement.
							// TODO: is this id always guaranteed to be unique and consistent across LoDs?
							item.id = `${ layerName }:${ feature.id }`;
							item.layer = layerName;
							item.properties = feature.properties;
							item.lat = lat;
							item.lon = lon;
							item.lodLevel = level;
							tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, item.position );

							const canonical = occupancy.register( item );
							items.push( canonical );
							this._enqueueSettling( canonical );

						}

					}

				}

				mvtTileItems.set( key, items );

			} else {

				const { occupancy, mvtTileItems } = this;
				const items = mvtTileItems.get( key );
				if ( items ) {

					for ( const item of items ) {

						occupancy.unregister( item );

					}

					mvtTileItems.delete( key );

				}

			}

		};

		// register events
		locks.addEventListener( 'toggle', this._onLockToggle );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.addEventListener( 'tile-download-start', this._onTileDownloadStart );

		//

		// late initialization
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processTileModel( scene, tile );

		} );

	}

	dispose() {

		if ( this._debugCanvas ) {

			this._debugCanvas.remove();

		}

		this.locks.removeEventListener( 'toggle', this._onLockToggle );
		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		this.tiles.removeEventListener( 'tile-download-start', this._onTileDownloadStart );

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: false } );

		} );

	}

	processTileModel( scene, tile ) {

		this._loadMVTForTile( scene, tile );

	}


	disposeTile( tile ) {

		const { tileLoadState, contentCache } = this;
		const info = tileLoadState.get( tile );
		if ( ! info ) {

			return;

		}

		if ( info.loaded ) {

			this._forEachTileInBounds( info.range, ( x, y, l ) => {

				// unlock all MVT sub tiles in a 2x2 pattern
				contentCache.release( x, y, l );

			} );

		}

		tileLoadState.delete( tile );
		info.disposed = true;

	}

	//

	async _loadMVTForTile( scene, tile ) {

		const { overlay, tiles, tileLoadState, locks } = this;
		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

		// we may have added the plugin after some tiles started loading
		let info = tileLoadState.get( tile );
		if ( ! info ) {

			info = {
				range: null,
				loaded: false,
				disposed: false,
			};
			tileLoadState.set( tile, info );

		}

		if ( info.disposed ) {

			return;

		}

		if ( info.range === null ) {

			// TODO: this currently only work with ellipsoidal projection
			_matrix.identity();
			if ( scene.parent !== null ) {

				_matrix.copy( tiles.group.matrixWorldInverse );

			}

			// TODO: why are we passing range vs region here?
			scene.updateMatrixWorld();
			const meshes = collectMeshes( scene );
			const { range } = getMeshesCartographicRange( meshes, tiles.ellipsoid, _matrix, overlay.projection );
			info.range = range;

		}

		const { contentCache } = this;
		const promises = [];
		this._forEachTileInBounds( info.range, ( x, y, l ) => {

			locks.markLoading( x, y, l );
			promises.push( contentCache.lock( x, y, l ) );

		} );

		try {

			await Promise.all( promises );

		} catch {

			this._forEachTileInBounds( info.range, ( x, y, l ) => {

				locks.unmarkLoading( x, y, l );

			} );
			return;

		}

		if ( info.disposed ) {

			// disposeTile already ran and skipped release because info.loaded was false —
			// we own the locks now, so release them here
			this._forEachTileInBounds( info.range, ( x, y, l ) => {

				locks.unmarkLoading( x, y, l );
				contentCache.release( x, y, l );

			} );
			return;

		}

		info.loaded = true;

		this._forEachTileInBounds( info.range, ( x, y, l ) => {

			locks.unmarkLoading( x, y, l );

		} );

		if ( tiles.visibleTiles.has( tile ) ) {

			this._forEachTileInBounds( info.range, ( x, y, l ) => {

				locks.markActive( x, y, l );

			} );

		}

	}

	_updateDebugGrid() {

		const { displayOccupancyGrid } = this;
		if ( ! displayOccupancyGrid ) {

			if ( this._debugCanvas ) {

				this._debugCanvas.remove();
				this._debugCanvas = null;

			}

			return;

		} else if ( displayOccupancyGrid && ! this._debugCanvas ) {

			// debug occupancy grid overlay
			const debugCanvas = document.createElement( 'canvas' );
			debugCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;opacity:0.5;';
			document.body.appendChild( debugCanvas );
			this._debugCanvas = debugCanvas;

		}

		// TODO: see if we can simplify this
		const { occupancy, _debugCanvas } = this;
		const { cells, size, resolution, buffer } = occupancy;
		const dpr = window.devicePixelRatio;
		const bufferX = resolution.width * buffer;
		const bufferY = resolution.height * buffer;
		const cols = Math.ceil( ( resolution.width + 2 * bufferX ) / size );
		const rows = Math.ceil( ( resolution.height + 2 * bufferY ) / size );

		_debugCanvas.width = Math.round( dpr * ( resolution.width + 2 * bufferX ) );
		_debugCanvas.height = Math.round( dpr * ( resolution.height + 2 * bufferY ) );
		_debugCanvas.style.width = `${ resolution.width + 2 * bufferX }px`;
		_debugCanvas.style.height = `${ resolution.height + 2 * bufferY }px`;
		_debugCanvas.style.left = `${ - bufferX }px`;
		_debugCanvas.style.top = `${ - bufferY }px`;

		const drawSize = size * dpr;
		const ctx = _debugCanvas.getContext( '2d' );
		ctx.clearRect( 0, 0, _debugCanvas.width, _debugCanvas.height );
		for ( let cy = 0; cy < rows; cy ++ ) {

			for ( let cx = 0; cx < cols; cx ++ ) {

				const occupied = cells[ cy * cols + cx ] !== 0;
				ctx.fillStyle = occupied ? 'rgba( 255, 80, 80, 0.6 )' : 'rgba( 80, 255, 80, 0.15 )';
				ctx.fillRect( cx * drawSize + 0.5, cy * drawSize + 0.5, drawSize - 1, drawSize - 1 );
				ctx.strokeStyle = occupied ? 'rgba( 255, 80, 80, 1 )' : 'rgba( 80, 255, 80, 0.25 )';
				ctx.lineWidth = 1;
				ctx.strokeRect( cx * drawSize + 0.5, cy * drawSize + 0.5, drawSize - 1, drawSize - 1 );

			}

		}

	}

	_enqueueSettling( item ) {

		const { _settlingQueueSet, _settlingQueue } = this;
		if ( _settlingQueueSet.has( item ) ) {

			return;

		}

		_settlingQueueSet.add( item );
		_settlingQueue.push( item );

	}

	_enqueueSettlingAll() {

		// enqueue all items for resettling
		for ( const items of this.mvtTileItems.values() ) {

			for ( const item of items ) {

				this._enqueueSettling( item );

			}

		}

	}

	_getLocalSettlingRay( item ) {

		// construct a ray for settling the items in the local tiles coordinate frame
		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		// construct the ray
		tiles.ellipsoid.getCartographicToPosition( item.lat, item.lon, 1e6, origin );
		tiles.ellipsoid.getCartographicToPosition( item.lat, item.lon, 0, direction );
		direction.sub( origin ).normalize();

		_raycaster.far = 2 * 1e6;
		_raycaster.firstHitOnly = true;

	}

	_processSettling() {

		// process items on the raycast queue for settling
		const {
			_settlingQueue,
			_settlingQueueSet,
			occupancy,
			maxSettleTimeMs,
			tiles,
			camera,
			sortCallback,
		} = this;

		const {
			visible,
		} = occupancy;

		// precompute which non-visible items have rays intersecting the camera frustum
		if ( camera !== null ) {

			// if we have a camera then run a check against the camera frustum first
			// so we can prioritize those that are potentially in view
			_ndcMatrix
				.copy( tiles.group.matrixWorld )
				.premultiply( camera.matrixWorldInverse )
				.premultiply( camera.projectionMatrix );

			_frustum.setFromProjectionMatrix( _ndcMatrix );
			for ( const item of _settlingQueue ) {

				// if it's already visible then we will prioritize it regardless
				if ( visible.has( item ) ) {

					continue;

				}

				// check if the projection ray intersects the frustum
				this._getLocalSettlingRay( item );
				if ( rayIntersectsFrustum( _raycaster, _frustum ) ) {

					_intersectingFrustum.add( item );

				}

			}

		}

		// sort ascending — highest-priority items at tail for pop()
		occupancy.syncItems();
		_settlingQueue.sort( ( a, b ) => {

			// prioritize items that are not ready and intersecting the frustum
			const aUnready = ! a.ready && _intersectingFrustum.has( a );
			const bUnready = ! b.ready && _intersectingFrustum.has( b );
			if ( aUnready !== bUnready ) {

				return aUnready ? 1 : - 1;

			} else if ( visible.has( a ) !== visible.has( b ) ) {

				// prioritize visible items
				return visible.has( a ) ? 1 : - 1;

			} else if ( _intersectingFrustum.has( a ) !== _intersectingFrustum.has( b ) ) {

				// prioritize items intersecting the frustum
				return _intersectingFrustum.has( a ) ? 1 : - 1;

			}

			const sort = - sortCallback( a, b );
			if ( sort !== 0 ) {

				return sort;

			} else if ( a.lodLevel !== b.lodLevel ) {

				// lod sort
				return a.lodLevel - b.lodLevel;

			} else {

				// use the id as the final sort without screen Y to avoid a slow "crawl"
				// of loaded items toward the top of the screen.
				return a.id < b.id ? 1 : - 1;

			}

		} );

		// run for a predetermined period to settle items
		const deadline = performance.now() + maxSettleTimeMs;
		while ( _settlingQueue.length > 0 ) {

			if ( performance.now() >= deadline ) {

				break;

			}

			const item = _settlingQueue.pop();
			_settlingQueueSet.delete( item );

			// skip items that were unregistered while in the queue
			if ( occupancy.getById( item.id ) !== item ) {

				continue;

			}

			this._settleItem( item );

		}

		// clear the set for next usage
		_intersectingFrustum.clear();

	}

	_settleItem( item ) {

		// casts a ray for the given item to settle it on the surface
		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		// get the local ray
		this._getLocalSettlingRay( item );

		// transform to world space for raycasting
		origin.applyMatrix4( tiles.group.matrixWorld );
		direction.transformDirection( tiles.group.matrixWorld );

		// snap the item to the surface
		const hits = _raycaster.intersectObject( tiles.group, true );
		if ( hits.length > 0 ) {

			hits[ 0 ].point.applyMatrix4( tiles.group.matrixWorldInverse );
			item.position.copy( hits[ 0 ].point );

		} else {

			// TODO: we are still seeing some points slip through tile gaps
			tiles.ellipsoid.getCartographicToPosition( item.lat, item.lon, 0, item.position );

		}

		item.ready = true;

	}

	_forEachTileInBounds( range, callback ) {

		// iterate over every mvt tile in the overlay
		const { overlay } = this;
		const { tiling } = overlay;
		const level = overlay.calculateLevel( range );

		if ( ! overlay.isReady ) {

			throw new Error( 'MVTAnnotationsPlugin: overlay is not ready.' );

		}

		forEachTileInBounds( range, level, tiling, callback );

	}

}
