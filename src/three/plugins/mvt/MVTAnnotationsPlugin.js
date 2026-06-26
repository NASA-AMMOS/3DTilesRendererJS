/** @import { Camera, Scene } from 'three' */
import { Matrix4 } from 'three';
import { MVTHierarchy } from './MVTHierarchy.js';
import { DelayedScreenOccupationManager } from './DelayedScreenOccupationManager.js';
import { SettlingManager } from './SettlingManager.js';
import { TextAnchorManager } from './TextAnchorManager.js';
import { OccupancyGridOverlay } from './debug/OccupancyGridOverlay.js';
import { LineAnnotationOverlay } from './debug/LineAnnotationOverlay.js';
import { LineAnnotation, parseLineAnnotations } from './annotations/LineAnnotation.js';
import { forEachTileInBounds, getMeshesCartographicRange } from '../images/overlays/utils.js';
import { parsePointAnnotations } from './annotations/PointAnnotation.js';
import { HierarchyOverlay } from './debug/HierarchyOverlay.js';

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
		} = options;

		// user settings
		this.overlay = overlay;
		this.camera = camera;
		this.sortCallback = sortCallback;
		this.filterAnnotation = filterAnnotation;
		this.onAnnotationsUpdate = onAnnotationsUpdate;

		// hierarchy for managing tile loading and visibility
		this.hierarchy = new MVTHierarchy();
		this.occupancy = new DelayedScreenOccupationManager();
		this.anchorManager = new TextAnchorManager();
		this.settlingManager = new SettlingManager();
		this.tileLoadState = new Map();

		// per MVT tile: { occupancyItems, settleItems } — items registered in the occupancy
		// grid and items that need raycast settling. Points are in both; line annotations
		// are in settleItems only ( anchors derived from them occupy the grid later )
		this.vectorTileInfo = new Map();

		// debug overlays
		this.debug = {
			occupancy: new OccupancyGridOverlay( this.occupancy ),
			paths: new LineAnnotationOverlay( this.anchorManager ),
			hierarchy: new HierarchyOverlay(),
		};

	}

	async init( tiles ) {

		// init
		this.tiles = tiles;

		const {
			overlay,
			occupancy,
			debug,
			hierarchy,
			settlingManager,
			contentCache,
		} = this;

		// init debug
		debug.paths.group = tiles.group;

		debug.hierarchy.hierarchy = hierarchy;
		debug.hierarchy.tiles = tiles;
		debug.hierarchy.tiling = overlay.tiling;

		settlingManager.occupancy = occupancy;
		settlingManager.tiles = tiles;

		hierarchy.contentCache = contentCache;

		// ensure the overlay is initialized
		overlay.init();

		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

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
			// and need to be re-settled against the updated scene
			settlingManager.markDirty();

			// TODO: the ImageOverlay Tile Splits is causing an issue here.
			this._markVectorTile( tile, visible );

		};

		this._onUpdateAfter = () => {

			hierarchy.update();

			// sync camera and localToWorld matrix into occupancy grid
			if ( this.camera !== null ) {

				tiles.getResolution( this.camera, occupancy.resolution );
				occupancy.camera = this.camera;
				occupancy.matrix.copy( tiles.group.matrixWorld );

			} else {

				occupancy.camera = null;

			}

			settlingManager.camera = this.camera;
			settlingManager.update();

			occupancy.update();
			this.onAnnotationsUpdate( occupancy.added, occupancy.removed );

			if ( occupancy.added.size > 0 || occupancy.removed.size > 0 ) {

				tiles.dispatchEvent( { type: 'needs-render' } );

			}

			if ( occupancy.hasPendingWork || settlingManager.hasPendingWork ) {

				tiles.dispatchEvent( { type: 'needs-update' } );

			}

			// debug
			debug.paths.camera = this.camera;
			debug.occupancy.update();
			debug.paths.update();
			debug.hierarchy.update();

		};

		this._onVectorTileToggle = ( { x, y, level, visible } ) => {

			tiles.dispatchEvent( { type: 'needs-update' } );

			const {
				contentCache,
				occupancy,
				filterAnnotation,
				vectorTileInfo,
				settlingManager,
				anchorManager,
			} = this;

			const key = `${ x }_${ y }_${ level }`;
			if ( visible ) {

				const { tiling } = overlay;
				const vectorTile = contentCache.get( x, y, level );

				const occupancyItems = new Set();
				const settleItems = new Set();
				vectorTileInfo.set( key, { occupancyItems, settleItems } );

				if ( ! vectorTile ) {

					return;

				}

				// parse the icon annotations
				const points = parsePointAnnotations( vectorTile, x, y, level, tiling, {
					filter: filterAnnotation,
				} );
				for ( const point of points ) {

					const canonical = occupancy.register( point );
					occupancyItems.add( canonical );
					settleItems.add( canonical );
					settlingManager.register( canonical );

				}

				// parse the paths
				const lines = parseLineAnnotations( vectorTile, x, y, level, tiling, {
					filter: filterAnnotation,
				} );
				for ( const line of lines ) {

					settleItems.add( line );
					settlingManager.register( line );

				}

				anchorManager.addLines( lines );

			} else {

				const info = vectorTileInfo.get( key );
				vectorTileInfo.delete( key );

				for ( const item of info.occupancyItems ) {

					occupancy.unregister( item );

				}

				for ( const item of info.settleItems ) {

					settlingManager.unregister( item );
					if ( item instanceof LineAnnotation ) {

						anchorManager.removeLine( item );

					}

				}

			}

		};

		this._onDisposeModel = ( { tile } ) => {

			this.tileLoadState.delete( tile );

		};

		// register events
		hierarchy.addEventListener( 'toggle', this._onVectorTileToggle );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.addEventListener( 'dispose-model', this._onDisposeModel );

		//

		// late initialization
		tiles.forEachLoadedModel( ( scene, tile ) => {

			this.processTileModel( scene, tile );
			if ( tiles.visibleTiles.has( tile ) ) {

				this._markVectorTile( tile, true );

			}

		} );

	}

	dispose() {

		const { debug, tiles, hierarchy, tileLoadState } = this;
		debug.occupancy.dispose();
		debug.paths.dispose();

		hierarchy.removeEventListener( 'toggle', this._onVectorTileToggle );
		tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.removeEventListener( 'dispose-model', this._onDisposeModel );

		tileLoadState.forEach( ( info, tile ) => {

			if ( info.active ) {

				this._markVectorTile( tile, false );

			}

		} );

	}

	processTileModel( scene, tile ) {

		const { tiles, overlay } = this;

		// TODO: this currently only work with ellipsoidal projection
		_matrix.identity();
		if ( scene.parent !== null ) {

			_matrix.copy( tiles.group.matrixWorldInverse );

		}

		// TODO: why are we passing range vs region here?
		scene.updateMatrixWorld();
		const meshes = collectMeshes( scene );
		const { range } = getMeshesCartographicRange( meshes, tiles.ellipsoid, _matrix, overlay.projection );

		// TODO: why not process here?
		this.tileLoadState.set( tile, {
			range,
			active: false,
		} );

	}

	//

	_markVectorTile( tile, state ) {

		const { tileLoadState } = this;
		const info = tileLoadState.get( tile );

		// TODO: is this "active" state needed? It should be trackable via visibility but it seems to be
		// causing some issues.
		info.active = state;
		this._forEachTileInBounds( info.range, ( x, y, l ) => {

			this.hierarchy.setTargetState( x, y, l, state );

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
