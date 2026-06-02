import { BufferAttribute, BufferGeometry, Group, MathUtils, Matrix4, Points, PointsMaterial } from 'three';
import { HierarchicalLock } from './HierarchicalLock.js';
import { PointAnnotationItem, ScreenOccupationManager } from './ScreenOccupationManager.js';
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

const _matrix = /* @__PURE__ */ new Matrix4();
const _ndcMatrix = /* @__PURE__ */ new Matrix4();
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
			displayOccupancyGrid = true,
		} = options;

		this.overlay = overlay;

		this.locks = new HierarchicalLock();
		this.occupancy = new ScreenOccupationManager();
		this.group = new Group();

		this.scene = scene;
		this.camera = camera;

		this.tileInfo = new Map();
		this.tileItems = new Map();

		// callback to filter which features become annotations:
		// getAnnotation( layerName, properties ) → boolean
		this.getAnnotation = null;
		this.displayOccupancyGrid = displayOccupancyGrid;

		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations

	}

	setCamera( camera ) {

		this.camera = camera;

	}

	init( tiles ) {

		const { locks, group, overlay, occupancy, tileInfo } = this;

		// debug occupancy grid overlay
		const debugCanvas = document.createElement( 'canvas' );
		debugCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;opacity:0.5;';
		document.body.appendChild( debugCanvas );
		this._debugCanvas = debugCanvas;

		const points = new Points();
		points.material.size = 10;
		points.material.sizeAttenuation = false;
		points.frustumCulled = false;
		group.add( points );
		points.updateMatrixWorld( true );
		this.POINTS = points;

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

			const { loaded, range } = tileInfo.get( tile );
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

		// single Points object updated from the occupancy visible set
		const pointsGeometry = new BufferGeometry();
		this.points = new Points( pointsGeometry, new PointsMaterial( { size: 10, sizeAttenuation: false } ) );
		group.add( this.points );

		const visibleItems = new Set();
		let pointsDirty = false;
		occupancy.addEventListener( 'added', ( { items } ) => {

			for ( const item of items ) visibleItems.add( item );
			pointsDirty = true;

		} );
		occupancy.addEventListener( 'removed', ( { items } ) => {

			for ( const item of items ) visibleItems.delete( item );
			pointsDirty = true;

		} );
		this._visibleItems = visibleItems;

		// sort: stable (already visible) items first so they hold their cells (hysteresis),
		// then closest to camera, then bottom-to-top on screen
		occupancy.sortCallback = ( a, b ) => {

			if ( a._depth !== b._depth ) {

				return a._depth - b._depth;

			} else {

				return b._screenPos.y - a._screenPos.y;

			}

		};

		this._onUpdateAfter = () => {

			// sync camera resolution and NDC matrix into occupancy grid
			if ( this.camera !== null ) {

				tiles.getResolution( this.camera, occupancy.resolution );

				_ndcMatrix
					.copy( tiles.group.matrixWorld )
					.premultiply( this.camera.matrixWorldInverse )
					.premultiply( this.camera.projectionMatrix );
				occupancy.matrix = _ndcMatrix;

			} else {

				occupancy.matrix = null;

			}

			// update visible text, points based on screen space conflicts
			occupancy.update();

			if ( pointsDirty ) {

				// console.log( occupancy.items, [ ...this._visibleItems ] );
				this._rebuildPoints( [ ...this._visibleItems ], this.POINTS );

			}

			if ( this.displayOccupancyGrid ) {

				this._drawDebugGrid();

			}

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

							const u = MathUtils.lerp( tMinX, tMaxX, point.x / extent );
							// tile Y=0 is geographic north; with flipY the V axis increases northward
							// so we invert vf when flipY is set
							const vf = point.y / extent;
							const v = tiling.flipY
								? MathUtils.lerp( tMaxY, tMinY, vf )
								: MathUtils.lerp( tMinY, tMaxY, vf );

							const [ lon, lat ] = tiling.toCartographicPoint( u, v );

							const item = new PointAnnotationItem();
							item.id = 'id' in feature ? `${ layerName }_${ feature.id }` : `${ x }_${ y }_${ level }_${ layerName }_${ i }`;
							item.layer = layerName;
							item.properties = feature.properties;
							tiles.ellipsoid.getCartographicToPosition( lat, lon, 10, item.position );

							occupancy.register( item );
							items.push( item );

						}

					}

				}

				tileItems.set( key, items );

			} else {

				const { occupancy, tileItems } = this;
				const items = tileItems.get( key );
				if ( items ) {

					for ( const item of items ) {

						occupancy.unregister( item );

					}

					tileItems.delete( key );

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

		this._debugCanvas.remove();
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

	_drawDebugGrid() {

		const { occupancy, _debugCanvas } = this;
		const { cells, size, resolution } = occupancy;
		const dpr = window.devicePixelRatio;
		const cols = Math.ceil( resolution.width / size );
		const rows = Math.ceil( resolution.height / size );

		_debugCanvas.width = dpr * resolution.width;
		_debugCanvas.height = dpr * resolution.height;

		const drawSize = size * dpr;
		const ctx = _debugCanvas.getContext( '2d' );
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

	_rebuildPoints( items, target ) {

		const visible = [ ...items ];
		const positions = new Float32Array( visible.length * 3 );
		for ( let i = 0; i < visible.length; i ++ ) {

			visible[ i ].position.toArray( positions, i * 3 );

		}

		target.geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );
		target.geometry.dispose();

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
