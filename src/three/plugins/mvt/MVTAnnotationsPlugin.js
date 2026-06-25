/** @import { Camera, Scene } from 'three' */
import { BufferAttribute, LineSegments, MathUtils, Matrix4, Points, Vector3 } from 'three';
import { MVTHierarchy } from './MVTHierarchy.js';
import { PointAnnotationItem } from './ScreenOccupationManager.js';
import { DelayedScreenOccupationManager } from './DelayedScreenOccupationManager.js';
import { SettlingManager } from './SettlingManager.js';
import { AnchorManager } from './AnchorManager.js';
import { LineAnnotation, parseLineAnnotations } from './LineAnnotation.js';
import { forEachTileInBounds, getMeshesCartographicRange } from '../images/overlays/utils.js';

const _matrix = /* @__PURE__ */ new Matrix4();
const _vector = /* @__PURE__ */ new Vector3();
const _lineList = [];
const _anchorList = [];

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
 * @param {boolean} [options.displayLines=false] - Draw a debug overlay of the settled line
 *   annotation paths.
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
			filterLine = () => false,
			onAnnotationsUpdate = () => {},
			camera = null,
			displayOccupancyGrid = false,
			displayLines = false,
		} = options;

		this.overlay = overlay;

		// hierarchy for managing tile loading and visibility
		this.hierarchy = null;
		this.occupancy = new DelayedScreenOccupationManager();

		// save the camera used for positioning icons
		this.camera = camera;

		// set of tile info (eg range, etc) and annotations associated with each tile
		this.tileLoadState = new Map();

		// per MVT tile: { occupancyItems, settleItems } — items registered in the occupancy
		// grid and items that need raycast settling. Points are in both; line annotations
		// are in settleItems only ( anchors derived from them occupy the grid later )
		this.vectorTileInfo = new Map();

		// callback to filter which features become annotations:
		this.sortCallback = sortCallback;
		this.filterAnnotation = filterAnnotation;
		this.filterLine = filterLine;
		this.onAnnotationsUpdate = onAnnotationsUpdate;
		this.displayOccupancyGrid = displayOccupancyGrid;
		this.displayLines = displayLines;

		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations
		// TODO: debounce occupancy decisions — wait N frames before dispatching "added" / "removed"
		//       so transient conflicts (camera micro-movement) don't cause visible flicker

	}

	async init( tiles ) {

		const { overlay, occupancy, tileLoadState } = this;

		// ensure the overlay is initialized
		overlay.init();

		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

		// init container
		this.tiles = tiles;
		this.hierarchy = new MVTHierarchy( this.contentCache );
		this.settling = new SettlingManager( {
			tiles,
			isPrioritized: item => occupancy.visible.has( item ),
		} );
		this.anchorManager = new AnchorManager();

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

		// event callbacks
		this._onVisibilityChange = ( { scene, tile, visible } ) => {

			// tile geometry changed — existing items may have been settled on this geometry
			// and need to be re-raycasted against the updated scene
			this.settling.markDirty();

			// TODO: the ImageOverlay Tile Splits is causing an issue here.
			const info = tileLoadState.get( tile );

			if ( visible ) {

				this._loadMVTForTile( scene, tile );

			} else {

				this._forEachTileInBounds( info.range, ( x, y, l ) => {

					this.hierarchy.setTargetState( x, y, l, false );

				} );

			}

		};

		this._onUpdateAfter = () => {

			this.hierarchy.update();

			// sync camera and localToWorld matrix into occupancy grid
			if ( this.camera !== null ) {

				tiles.getResolution( this.camera, occupancy.resolution );
				occupancy.camera = this.camera;
				occupancy.matrix.copy( tiles.group.matrixWorld );

			} else {

				occupancy.camera = null;

			}

			this.settling.camera = this.camera;
			this.settling.update();

			occupancy.update();
			this.onAnnotationsUpdate( occupancy.added, occupancy.removed );
			this._updateDebugGrid();
			this._updateDebugLines();

			if ( occupancy.added.size > 0 || occupancy.removed.size > 0 ) {

				tiles.dispatchEvent( { type: 'needs-render' } );

			}

			if ( occupancy.hasPendingWork || this.settling.hasPendingWork ) {

				tiles.dispatchEvent( { type: 'needs-update' } );

			}

		};

		this._onToggle = ( { x, y, level, visible } ) => {

			tiles.dispatchEvent( { type: 'needs-update' } );

			const key = `${ x }_${ y }_${ level }`;

			if ( visible ) {

				const { contentCache, occupancy, filterAnnotation, filterLine, vectorTileInfo } = this;
				const { tiling } = overlay;
				const vectorTile = contentCache.get( x, y, level );
				if ( ! vectorTile ) {

					return;

				}

				// get the normalized tile bound
				const tileBounds = tiling.getTileBounds( x, y, level, true, false );
				const [ tMinX, tMinY, tMaxX, tMaxY ] = tileBounds;
				const occupancyItems = new Set();
				const settleItems = new Set();

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
							occupancyItems.add( canonical );
							settleItems.add( canonical );
							this.settling.register( canonical );

						}

					}

				}

				// parse labeled line features into stitched, subsampled paths; these are
				// settled but ( unlike points ) are not registered in the occupancy grid
				const lines = parseLineAnnotations( vectorTile, x, y, level, tiling, {
					filter: filterLine,
				} );
				for ( const line of lines ) {

					settleItems.add( line );
					this.settling.register( line );
					this.anchorManager.addLine( line );

				}

				vectorTileInfo.set( key, { occupancyItems, settleItems } );

			} else {

				const { occupancy, vectorTileInfo } = this;
				const info = vectorTileInfo.get( key );
				if ( info ) {

					for ( const item of info.occupancyItems ) {

						occupancy.unregister( item );

					}

					for ( const item of info.settleItems ) {

						this.settling.unregister( item );
						if ( item instanceof LineAnnotation ) {

							this.anchorManager.removeLine( item );

						}

					}

					vectorTileInfo.delete( key );

				}

			}

		};

		this._onDisposeTile = ( { tile } ) => {

			const { tileLoadState } = this;
			tileLoadState.delete( tile );

		};

		// register events
		this.hierarchy.addEventListener( 'toggle', this._onToggle );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.addEventListener( 'dispose-tile', this._onDisposeTile );

		//

		// late initialization
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processTileModel( scene, tile );
			if ( tiles.visibleTiles.has( tile ) ) {

				this._loadMVTForTile( scene, tile );

			}

		} );

	}

	dispose() {

		if ( this._debugCanvas ) {

			this._debugCanvas.remove();

		}

		if ( this._debugLines ) {

			this._debugLines.removeFromParent();
			this._debugLines.geometry.dispose();
			this._debugLines.material.dispose();

		}

		if ( this._debugPoints ) {

			this._debugPoints.removeFromParent();
			this._debugPoints.geometry.dispose();
			this._debugPoints.material.dispose();

		}

		this.hierarchy.removeEventListener( 'toggle', this._onToggle );
		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		this.tiles.removeEventListener( 'dispose-tile', this._onDisposeTile );

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: false } );

		} );

	}

	// collect all currently loaded line annotations ( for rendering / debug )
	getLineAnnotations( target = [] ) {

		target.length = 0;
		for ( const { settleItems } of this.vectorTileInfo.values() ) {

			for ( const item of settleItems ) {

				if ( item instanceof LineAnnotation ) {

					target.push( item );

				}

			}

		}

		return target;

	}

	processTileModel( scene, tile ) {

		this.tileLoadState.set( tile, {
			range: null,
		} );

	}

	//

	_loadMVTForTile( scene, tile ) {

		const { overlay, tiles, tileLoadState } = this;
		const info = tileLoadState.get( tile );

		// initialize the bounds
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

		this._forEachTileInBounds( info.range, ( x, y, l ) => {

			this.hierarchy.setTargetState( x, y, l, true );

		} );

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

	_updateDebugLines() {

		const { displayLines, tiles } = this;
		if ( ! displayLines ) {

			if ( this._debugLines ) {

				this._debugLines.removeFromParent();
				this._debugLines.geometry.dispose();
				this._debugLines.material.dispose();
				this._debugLines = null;

			}

			if ( this._debugPoints ) {

				this._debugPoints.removeFromParent();
				this._debugPoints.geometry.dispose();
				this._debugPoints.material.dispose();
				this._debugPoints = null;

			}

			return;

		} else if ( ! this._debugLines ) {

			// debug overlay drawn in the tiles group, rebuilt each frame
			const lineSegments = new LineSegments();
			lineSegments.material.depthTest = false;
			lineSegments.material.transparent = true;
			lineSegments.material.depthWrite = false;
			lineSegments.frustumCulled = false;
			lineSegments.raycast = () => {};

			tiles.group.add( lineSegments );
			this._debugLines = lineSegments;

			// anchor positions drawn as points
			const points = new Points();
			points.material.color.set( 0xffffff );
			points.material.size = 6;
			points.material.sizeAttenuation = false;
			points.material.transparent = true;
			points.material.depthTest = false;
			points.frustumCulled = false;
			points.raycast = () => {};

			tiles.group.add( points );
			this._debugPoints = points;

		}

		const debugLines = this._debugLines;
		const lines = this.getLineAnnotations( _lineList );

		// place the object near the camera ( in tiles.group local space ) so vertex
		// coordinates stay small and avoid float jitter at globe scale
		if ( this.camera !== null ) {

			_vector.setFromMatrixPosition( this.camera.matrixWorld );
			tiles.group.worldToLocal( _vector );

		}

		// count settled segment vertices across all lines
		let vertexCount = 0;
		for ( const line of lines ) {

			if ( line.ready ) {

				vertexCount += ( line.count - 1 ) * 2;

			}

		}

		// build one segment buffer relative to the camera-local origin
		const positions = new Float32Array( vertexCount * 3 );
		let o = 0;
		for ( const line of lines ) {

			if ( ! line.ready ) {

				continue;

			}

			const ps = line.positions;
			for ( let i = 0, l = ps.length - 1; i < l; i ++ ) {

				const a = ps[ i ];
				const b = ps[ i + 1 ];
				positions[ o ++ ] = a.x - _vector.x;
				positions[ o ++ ] = a.y - _vector.y;
				positions[ o ++ ] = a.z - _vector.z;
				positions[ o ++ ] = b.x - _vector.x;
				positions[ o ++ ] = b.y - _vector.y;
				positions[ o ++ ] = b.z - _vector.z;

			}

		}

		debugLines.geometry.dispose();
		debugLines.geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );
		debugLines.position.copy( _vector );
		debugLines.updateMatrixWorld();

		// build anchor points from the persistent anchors at their active ( highest-LoD
		// ready ) path, interpolating the settled positions at the anchor's slot
		const debugPoints = this._debugPoints;
		const anchorItems = this.anchorManager.getAnchors( _anchorList );

		let anchorCount = 0;
		for ( const anchor of anchorItems ) {

			if ( anchor.getActiveEntry() !== null ) {

				anchorCount ++;

			}

		}

		const anchorPositions = new Float32Array( anchorCount * 3 );
		let p = 0;
		for ( const anchor of anchorItems ) {

			const entry = anchor.getActiveEntry();
			if ( entry === null ) {

				continue;

			}

			const ps = entry.line.positions;
			const a = ps[ entry.i0 ];
			const b = ps[ entry.i1 ];
			const alpha = entry.alpha;
			anchorPositions[ p ++ ] = a.x + ( b.x - a.x ) * alpha - _vector.x;
			anchorPositions[ p ++ ] = a.y + ( b.y - a.y ) * alpha - _vector.y;
			anchorPositions[ p ++ ] = a.z + ( b.z - a.z ) * alpha - _vector.z;

		}

		debugPoints.geometry.dispose();
		debugPoints.geometry.setAttribute( 'position', new BufferAttribute( anchorPositions, 3 ) );
		debugPoints.position.copy( _vector );
		debugPoints.updateMatrixWorld();

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
