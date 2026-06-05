import { Frustum, Group, MathUtils, Matrix4, Raycaster, Vector3 } from 'three';
import { CirclePointsMaterial } from './CirclePointsMaterial.js';
import { AnnotationGlyphAtlasTexture } from './AnnotationGlyphAtlasTexture.js';
import { AnnotationsPoints } from './AnnotationsPoints.js';
import { HierarchicalLock } from './HierarchicalLock.js';
import { PointAnnotationItem } from './ScreenOccupationManager.js';
import { DelayedScreenOccupationManager } from './DelayedScreenOccupationManager.js';
import { forEachTileInBounds, getMeshesCartographicRange } from '../images/overlays/utils.js';

// TODO:
// - "fetch data" override needs to be handled differently? Switch to default download
// queue / process queue, instead (generated surface has issue, too)
// - consider continue to lock child tiles when zooming out, avoiding parent tile gaps

function collectMeshes( object ) {

	const meshes = [];
	object.traverse( c => {

		if ( c.isMesh ) {

			meshes.push( c );

		}

	} );

	return meshes;

}

const PARALLEL_EPSILON = 1e-10;

const _matrix = /* @__PURE__ */ new Matrix4();
const _ndcMatrix = /* @__PURE__ */ new Matrix4();
const _raycaster = /* @__PURE__ */ new Raycaster();
const _cameraLocalPos = /* @__PURE__ */ new Vector3();
const _frustum = /* @__PURE__ */ new Frustum();

function rayIntersectsFrustum( raycaster, frustum ) {

	const { origin, direction } = raycaster.ray;
	const planes = frustum.planes;
	let tEnter = 0;
	let tExit = raycaster.far;

	for ( let i = 0; i < 6; i ++ ) {

		const plane = planes[ i ];
		const denom = plane.normal.dot( direction );
		const dist = plane.distanceToPoint( origin );

		if ( Math.abs( denom ) < PARALLEL_EPSILON ) {

			if ( dist < 0 ) {

				return false;

			}

		} else {

			const t = - dist / denom;
			if ( denom > 0 ) {

				if ( t > tEnter ) {

					tEnter = t;

				}

			} else {

				if ( t < tExit ) {

					tExit = t;

				}

			}

			if ( tEnter > tExit ) {

				return false;

			}

		}

	}

	return true;

}

export class MVTAnnotationsPlugin {

	get contentCache() {

		return this.overlay.imageSource._contentCache;

	}

	constructor( options = {} ) {

		this.priority = Infinity;
		this.name = 'MVT_ANNOTATIONS_PLUGIN';

		const {
			overlay,
			camera = null,
			scene = null,
			displayOccupancyGrid = false,
		} = options;

		this.overlay = overlay;

		this.locks = new HierarchicalLock();
		this.occupancy = new DelayedScreenOccupationManager();
		this.group = new Group();

		this.scene = scene;
		this.camera = camera;

		this.tileInfo = new Map();
		this.tileItems = new Map();

		// callback to filter which features become annotations:
		// getAnnotation( layerName, properties ) → boolean
		this.getAnnotation = null;
		this.displayOccupancyGrid = displayOccupancyGrid;

		this._raycastQueue = [];
		this._raycastQueueSet = new Set();
		this.maxRaycastTimeMs = 5;

		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations
		// TODO: debounce occupancy decisions — wait N frames before dispatching "added" / "removed"
		//       so transient conflicts (camera micro-movement) don't cause visible flicker

	}

	setCamera( camera ) {

		this.camera = camera;

	}

	init( tiles ) {

		const { locks, group, overlay, occupancy, tileInfo } = this;

		this._glyphAtlas = new AnnotationGlyphAtlasTexture();

		const pointsMaterial = new CirclePointsMaterial( {
			size: 25,
			sizeAttenuation: false,
			depthWrite: false,
			depthTest: false,
		} );
		pointsMaterial.glyphTexture = this._glyphAtlas;
		const { u, v } = this._glyphAtlas.glyphCellUVSize;
		pointsMaterial.glyphCellSize.set( u, v );

		this._annotationsPoints = new AnnotationsPoints( pointsMaterial );
		group.add( this._annotationsPoints );
		this._lastUpdateTime = - 1;

		// Rebuild geometry once the sprite sheet has loaded so icons appear on already-visible points
		this._glyphAtlas._loadPromise.then( () => {

			this._annotationsPoints._structureDirty = true;

		} );

		// init container
		this.tiles = tiles;
		tiles.group.add( group );

		this._onTileDownloadStart = ( { tile } ) => {

			const info = {
				range: null,
				loaded: false,
				disposed: false,
			};

			tileInfo.set( tile, info );

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
				// this._forEach2x2TileInBounds( range, ( x, y, l ) => {

				// 	// lock MVT content in a 2x2 pattern
				// 	contentCache.lock( x, y, l );

				// } );

			}

		};

		// event callbacks
		this._onVisibilityChange = ( { tile, visible } ) => {

			const info = tileInfo.get( tile );

			// TODO: the ImageOverlay Tile Splits is causing an issue here.
			if ( ! info ) return;

			const { loaded, range } = info;
			if ( loaded ) {

				this._forEach2x2TileInBounds( range, ( x, y, l ) => {

					// mark all tiles as "active" if visible in a 2x2 pattern
					if ( visible ) {

						locks.markActive( x, y, l );

					} else {

						locks.markInactive( x, y, l );

					}

				} );

			}

		};


		// sort: already-visible items first, then by pmap:rank ascending, then closest to camera, then bottom-to-top on screen
		occupancy.sortCallback = ( a, b ) => {

			const aVis = occupancy.visible.has( a ) ? 0 : 1;
			const bVis = occupancy.visible.has( b ) ? 0 : 1;
			if ( aVis !== bVis ) {

				return aVis - bVis;

			}

			const rankA = a.properties[ 'rank' ] ?? a.properties[ 'pmap:rank' ] ?? Infinity;
			const rankB = b.properties[ 'rank' ] ?? b.properties[ 'pmap:rank' ] ?? Infinity;
			if ( rankA !== rankB ) {

				return rankA - rankB;

			}

			if ( a._depth !== b._depth ) {

				return a._depth - b._depth;

			}

			return b._screenPos.y - a._screenPos.y;

		};

		this._onUpdateAfter = () => {

			// sync camera resolution, NDC matrix, and local camera position into occupancy grid
			if ( this.camera !== null ) {

				tiles.getResolution( this.camera, occupancy.resolution );

				_ndcMatrix
					.copy( tiles.group.matrixWorld )
					.premultiply( this.camera.matrixWorldInverse )
					.premultiply( this.camera.projectionMatrix );
				occupancy.matrix = _ndcMatrix;

				// camera position in tiles.group local space — used for perspective culling and RTE
				_matrix.copy( tiles.group.matrixWorld ).invert();
				_cameraLocalPos.setFromMatrixPosition( this.camera.matrixWorld ).applyMatrix4( _matrix );
				occupancy.cameraPosition = _cameraLocalPos;

			} else {

				occupancy.matrix = null;
				occupancy.cameraPosition = null;

			}

			const now = performance.now() / 1000;
			const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
			this._lastUpdateTime = now;

			// update visible points based on screen-space conflicts
			this._processRaycastQueue();
			// fires 'added'/'removed' → AnnotationsPoints.addItems/removeItems
			occupancy.update();

			// camera-relative rendering: position object at camera so buffer coords are
			// small offsets — avoids Float32 precision jitter at globe scale
			if ( this.camera !== null ) {

				this._annotationsPoints.position.copy( _cameraLocalPos );
				this._annotationsPoints.updateMatrixWorld( true );

			}

			this._annotationsPoints.update( dt, occupancy.visible, this._glyphAtlas );
			this._updateDebugGrid();

		};

		this._onLockToggle = ( { x, y, level, active } ) => {

			const key = `${ x }_${ y }_${ level }`;

			if ( active ) {

				const { contentCache, occupancy, getAnnotation, tileItems } = this;
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

					if ( layerName === 'places' ) continue;

					const layer = vectorTile.layers[ layerName ];
					const extent = layer.extent;

					for ( let i = 0; i < layer.length; i ++ ) {

						// process only points
						const feature = layer.feature( i );
						if ( feature.type !== 1 ) {

							continue;

						}

						if ( getAnnotation !== null && ! getAnnotation( layerName, layer.properties ) ) {

							continue;

						}

						// retrieve the geometry
						const geometry = feature.loadGeometry();
						for ( const [ point ] of geometry ) {

							// TODO: is this necessary?
							if ( point.x < 0 || point.x > extent || point.y < 0 || point.y > extent ) {

								continue;

							}

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
							item.id = `${ layerName }:${ feature.id }`;
							item.layer = layerName;
							item.properties = feature.properties;
							item.lat = lat;
							item.lon = lon;
							item.lodLevel = level;
							tiles.ellipsoid.getCartographicToPosition( lat, lon, 0, item.position );

							const canonical = occupancy.register( item );
							items.push( canonical );
							this._enqueueRaycast( canonical );

						}

					}

				}

				tileItems.set( key, items );
				this._enqueueRaycastAll();

			} else {

				const { occupancy, tileItems } = this;
				const items = tileItems.get( key );
				if ( items ) {

					for ( const item of items ) {

						occupancy.unregister( item );

					}

					tileItems.delete( key );

				}

				this._enqueueRaycastAll();

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

		this.group.removeFromParent();
		this.locks.removeEventListener( 'toggle', this._onLockToggle );
		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		this.tiles.removeEventListener( 'tile-download-start', this._onTileDownloadStart );

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: false } );

		} );

	}

	async processTileModel( scene, tile ) {

		const { overlay, tiles, tileInfo, locks } = this;
		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

		// we may have added the plugin after some tiles started loading
		let info = tileInfo.get( tile );
		if ( ! info ) {

			info = { range: null, loaded: false, disposed: false };
			tileInfo.set( tile, info );

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

		// lock all related MVT sub tiles in a 2x2 pattern
		const { contentCache	} = this;
		const promises = [];
		this._forEach2x2TileInBounds( info.range, ( x, y, l ) => {

			promises.push( contentCache.lock( x, y, l ) );

		} );

		try {

			await Promise.all( promises );

		} catch {

			return;

		}

		if ( info.disposed ) {

			// disposeTile already ran and skipped release because info.loaded was false —
			// we own the locks now, so release them here
			this._forEach2x2TileInBounds( info.range, ( x, y, l ) => {

				contentCache.release( x, y, l );

			} );
			return;

		}

		info.loaded = true;

		if ( tiles.visibleTiles.has( tile ) ) {

			// mark all tiles as "active" if visible in a 2x2 pattern
			this._forEach2x2TileInBounds( info.range, ( x, y, l ) => {

				locks.markActive( x, y, l );

			} );

		}

	}

	_updateDebugGrid() {

		const { displayOccupancyGrid } = this;
		if ( ! displayOccupancyGrid ) {

			if ( this._debugCanvas ) {

				_debugCanvas.remove();

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

	_enqueueRaycast( item ) {

		if ( this._raycastQueueSet.has( item ) ) {

			return;

		}

		// item.ready = false;
		this._raycastQueueSet.add( item );
		this._raycastQueue.push( item );

	}

	_enqueueRaycastAll() {

		for ( const items of this.tileItems.values() ) {

			for ( const item of items ) {

				this._enqueueRaycast( item );

			}

		}

	}

	_processRaycastQueue() {

		const { _raycastQueue, _raycastQueueSet, occupancy, maxRaycastTimeMs, tiles, camera } = this;
		const { visible, sortCallback } = occupancy;

		// precompute which non-visible items have rays intersecting the camera frustum
		const inFrustum = new Set();
		if ( this.camera !== null ) {

			_ndcMatrix
				.copy( tiles.group.matrixWorld )
				.premultiply( camera.matrixWorldInverse )
				.premultiply( camera.projectionMatrix );

			_frustum.setFromProjectionMatrix( _ndcMatrix );
			for ( const item of _raycastQueue ) {

				if ( visible.has( item ) ) {

					continue;

				}

				this._setupRaycastRay( item );
				if ( rayIntersectsFrustum( _raycaster, _frustum ) ) {

					inFrustum.add( item );

				}

			}

		}

		// sort ascending — highest-priority items at tail for pop()
		// tiers: unsettled+inFrustum=3, visible=2, settled+inFrustum=1, outside frustum=0
		_raycastQueue.sort( ( a, b ) => {

			const aUnsettledInFrustum = ! a.ready && inFrustum.has( a );
			const bUnsettledInFrustum = ! b.ready && inFrustum.has( b );
			if ( aUnsettledInFrustum !== bUnsettledInFrustum ) {

				return aUnsettledInFrustum ? 1 : - 1;

			}

			const aVisible = visible.has( a );
			const bVisible = visible.has( b );
			if ( aVisible !== bVisible ) {

				return aVisible ? 1 : - 1;

			}

			const aInFrustum = inFrustum.has( a );
			const bInFrustum = inFrustum.has( b );
			if ( aInFrustum !== bInFrustum ) {

				return aInFrustum ? 1 : - 1;

			}

			return - sortCallback( a, b );

		} );

		const deadline = performance.now() + maxRaycastTimeMs;
		while ( _raycastQueue.length > 0 ) {

			if ( performance.now() >= deadline ) break;

			const item = _raycastQueue.pop();
			_raycastQueueSet.delete( item );

			// skip items replaced by a LoD swap
			if ( occupancy.getById( item.id ) !== item ) {

				continue;

			}

			this._raycastItem( item );

		}

	}

	_setupRaycastRay( item ) {

		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		tiles.ellipsoid.getCartographicToPosition( item.lat, item.lon, 1e6, origin );
		tiles.ellipsoid.getCartographicToPosition( item.lat, item.lon, 0, direction );
		direction.sub( origin ).normalize();
		_raycaster.far = 2 * 1e6;
		_raycaster.firstHitOnly = true;

	}

	_raycastItem( item ) {

		const { tiles } = this;
		const { origin, direction } = _raycaster.ray;

		this._setupRaycastRay( item );

		origin.applyMatrix4( tiles.group.matrixWorld );
		direction.transformDirection( tiles.group.matrixWorld );

		const hits = _raycaster.intersectObject( tiles.group, true );
		if ( hits.length > 0 ) {

			hits[ 0 ].point.applyMatrix4( tiles.group.matrixWorldInverse );
			item.position.copy( hits[ 0 ].point );

		} else {

			tiles.ellipsoid.getCartographicToPosition( item.lat, item.lon, 0, item.position );

		}

		item.ready = true;

	}

	disposeTile( tile ) {

		const { tileInfo, contentCache } = this;
		const info = tileInfo.get( tile );
		if ( ! info ) {

			return;

		}

		if ( info.loaded ) {

			this._forEach2x2TileInBounds( info.range, ( x, y, l ) => {

				// unlock all MVT sub tiles in a 2x2 pattern
				contentCache.release( x, y, l );

			} );

		}

		tileInfo.delete( tile );
		info.disposed = true;

	}

	//

	_forEach2x2TileInBounds( range, callback ) {

		// fire these in 2x2 chunks so that sibling tiles are guaranteed to be present
		const { overlay } = this;
		const { tiling } = overlay;
		const level = overlay.calculateLevel( range );

		if ( ! overlay.isReady ) {

			throw new Error();

		}

		forEachTileInBounds( range, level, tiling, ( x, y, l ) => {

			const bx = Math.floor( x * 0.5 ) * 2;
			const by = Math.floor( y * 0.5 ) * 2;

			callback( bx + 0, by + 0, l );
			callback( bx + 1, by + 0, l );
			callback( bx + 0, by + 1, l );
			callback( bx + 1, by + 1, l );

		} );

	}

}
