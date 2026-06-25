/** @import { Camera, Scene } from 'three' */
import { Matrix4 } from 'three';
import { MVTHierarchy } from './MVTHierarchy.js';
import { DelayedScreenOccupationManager } from './DelayedScreenOccupationManager.js';
import { SettlingManager } from './SettlingManager.js';
import { TextAnchorManager } from './AnchorManager.js';
import { OccupancyGridOverlay } from './debug/OccupancyGridOverlay.js';
import { LineAnnotationOverlay } from './debug/LineAnnotationOverlay.js';
import { LineAnnotation, parseLineAnnotations } from './annotations/LineAnnotation.js';
import { forEachTileInBounds, getMeshesCartographicRange } from '../images/overlays/utils.js';
import { parsePointAnnotations } from './annotations/PointAnnotation.js';

const _matrix = /* @__PURE__ */ new Matrix4();

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

	get displayOccupancyGrid() {

		return this._occupancyOverlay.enabled;

	}

	set displayOccupancyGrid( v ) {

		this._occupancyOverlay.enabled = v;

	}

	get displayAnnotationLines() {

		return this._occupancyOverlay.enabled;

	}

	set displayAnnotationLines( v ) {

		this._occupancyOverlay.enabled = v;

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
		this.anchorManager = new TextAnchorManager();
		this.settlingManager = null;

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

		// debug overlays
		this._occupancyOverlay = new OccupancyGridOverlay( this.occupancy );
		this._lineOverlay = new LineAnnotationOverlay( this.anchorManager );

		// TODO: add "text" manager for text
		// TODO: add a "fade" manager for hiding an showing annotations
		// TODO: debounce occupancy decisions — wait N frames before dispatching "added" / "removed"
		//       so transient conflicts (camera micro-movement) don't cause visible flicker

		this.displayOccupancyGrid = displayOccupancyGrid;
		this.displayLines = displayLines;

	}

	async init( tiles ) {

		const { overlay, occupancy, tileLoadState, _lineOverlay } = this;

		// ensure the overlay is initialized
		overlay.init();

		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

		// init container
		this.tiles = tiles;
		this.hierarchy = new MVTHierarchy( this.contentCache );
		this.settlingManager = new SettlingManager( {
			tiles,
			isPrioritized: item => occupancy.visible.has( item ),
		} );

		// init fields
		_lineOverlay.group = tiles.group;
		_lineOverlay.settlingManager = this.settlingManager;

		// init occupancy
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
			this.settlingManager.markDirty();

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

			this.settlingManager.camera = this.camera;
			this.settlingManager.update();

			occupancy.update();
			this.onAnnotationsUpdate( occupancy.added, occupancy.removed );
			this._occupancyOverlay.update();
			this._lineOverlay.enabled = this.displayLines;
			this._lineOverlay.camera = this.camera;
			this._lineOverlay.update();

			if ( occupancy.added.size > 0 || occupancy.removed.size > 0 ) {

				tiles.dispatchEvent( { type: 'needs-render' } );

			}

			if ( occupancy.hasPendingWork || this.settlingManager.hasPendingWork ) {

				tiles.dispatchEvent( { type: 'needs-update' } );

			}

		};

		this._onToggle = ( { x, y, level, visible } ) => {

			tiles.dispatchEvent( { type: 'needs-update' } );

			const key = `${ x }_${ y }_${ level }`;

			if ( visible ) {

				const {
					contentCache,
					occupancy,
					filterAnnotation,
					filterLine,
					vectorTileInfo,
					settlingManager,
					anchorManager,
				} = this;

				const { tiling } = overlay;
				const vectorTile = contentCache.get( x, y, level );
				if ( ! vectorTile ) {

					return;

				}

				const occupancyItems = new Set();
				const settleItems = new Set();

				// get the normalized tile bound
				const points = parsePointAnnotations( vectorTile, x, y, level, tiling, {
					filter: filterAnnotation,
				} );
				for ( const point of points ) {

					const canonical = occupancy.register( point );
					occupancyItems.add( canonical );
					settleItems.add( canonical );
					settlingManager.register( canonical );

				}

				// parse labeled line features into stitched, subsampled paths; these are
				// settled but ( unlike points ) are not registered in the occupancy grid
				const lines = parseLineAnnotations( vectorTile, x, y, level, tiling, {
					filter: filterLine,
				} );
				for ( const line of lines ) {

					settleItems.add( line );
					settlingManager.register( line );
					anchorManager.addLine( line );

				}

				vectorTileInfo.set( key, { occupancyItems, settleItems } );

			} else {

				const {
					occupancy,
					vectorTileInfo,
					settlingManager,
					anchorManager,
				} = this;

				const info = vectorTileInfo.get( key );
				if ( info ) {

					for ( const item of info.occupancyItems ) {

						occupancy.unregister( item );

					}

					for ( const item of info.settleItems ) {

						settlingManager.unregister( item );
						if ( item instanceof LineAnnotation ) {

							anchorManager.removeLine( item );

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

		this._occupancyOverlay.dispose();
		this._lineOverlay.dispose();

		this.hierarchy.removeEventListener( 'toggle', this._onToggle );
		this.tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		this.tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		this.tiles.removeEventListener( 'dispose-tile', this._onDisposeTile );

		this.tiles.forEachLoadedModel( ( scene, tile ) => {

			this._onVisibilityChange( { scene, tile, visible: false } );

		} );

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
