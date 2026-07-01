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
import { PointAnnotationManager } from './annotations/PointAnnotationManager.js';

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
 * @param {( char: string ) => number} [options.measureCharacter] - Returns a per-character
 *   advance width used for text label spacing. Temporary hook — wiring to be cleaned up.
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
			measureCharacter = () => 1,
			camera = null,
		} = options;

		// user settings
		this.overlay = overlay;
		this.camera = camera;
		this.sortCallback = sortCallback;
		this.filterAnnotation = filterAnnotation;
		this.onAnnotationsUpdate = onAnnotationsUpdate;

		// TODO: temporary — provides per-character advance widths for text label layout
		this.measureCharacter = measureCharacter;

		// hierarchy for managing tile loading and visibility
		this.hierarchy = new MVTHierarchy();
		this.occupancy = new DelayedScreenOccupationManager();
		this.anchorManager = new TextAnchorManager();
		this.pointManager = new PointAnnotationManager();
		this.settlingManager = new SettlingManager();
		this.tileLoadState = new Map();
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
			pointManager,
			anchorManager,
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

			} else if ( b.screenPos.y !== a.screenPos.y ) {

				// distance up the screen
				return b.screenPos.y - a.screenPos.y;

			} else {

				return a.id > b.id ? 1 : - 1;

			}

		};

		// event callbacks
		this._onVisibilityChange = ( { scene, tile, visible } ) => {

			// tile geometry changed — existing items may have been settled on this geometry
			// and need to be re-settled against the updated scene
			settlingManager.needsUpdate = true;

			// TODO: the ImageOverlay Tile Splits is causing an issue here since we can't
			// automatically load higher res data than what the tiles are allowing
			this._markVectorTile( tile, visible );

		};

		this._onUpdateAfter = () => {

			// sync camera and localToWorld matrix into occupancy grid
			const { camera } = this;
			if ( camera !== null ) {

				tiles.getResolution( camera, occupancy.resolution );
				occupancy.matrix.copy( tiles.group.matrixWorld );

			}

			// update all sub managers
			hierarchy.update();

			// point annotations
			pointManager.update();
			pointManager.added.forEach( item => {

				occupancy.register( item );
				settlingManager.register( item );

			} );
			pointManager.removed.forEach( item => {

				occupancy.unregister( item );
				settlingManager.unregister( item );

			} );
			pointManager.reset();

			// text anchors
			anchorManager.update();
			anchorManager.added.forEach( item => {

				item.measureCharacter = this.measureCharacter;
				occupancy.register( item );

			} );
			anchorManager.removed.forEach( item => {

				occupancy.unregister( item );

			} );
			anchorManager.reset();

			// raycasters
			settlingManager.camera = camera;
			settlingManager.update();

			// occupancy
			occupancy.camera = camera;
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
				filterAnnotation,
				vectorTileInfo,
				settlingManager,
				anchorManager,
				pointManager,
			} = this;

			const key = `${ x }_${ y }_${ level }`;
			if ( visible ) {

				const { tiling } = overlay;
				const vectorTile = contentCache.get( x, y, level );

				if ( ! vectorTile ) {

					vectorTileInfo.set( key, { annotations: [] } );
					return;

				}

				// parse the icon annotations
				const annotations = [];
				parsePointAnnotations( vectorTile, x, y, level, tiling, filterAnnotation, annotations );
				parseLineAnnotations( vectorTile, x, y, level, tiling, filterAnnotation, annotations );
				vectorTileInfo.set( key, { annotations } );

				for ( const ann of annotations ) {

					if ( ann instanceof LineAnnotation ) {

						settlingManager.register( ann );

					} else {

						pointManager.add( ann );

					}

				}

				// add the anchors
				anchorManager.addLines( annotations.filter( ann => ann instanceof LineAnnotation ) );

			} else {

				const { annotations } = vectorTileInfo.get( key );
				vectorTileInfo.delete( key );

				for ( const item of annotations ) {

					if ( item instanceof LineAnnotation ) {

						settlingManager.unregister( item );

					} else {

						pointManager.delete( item );

					}

				}

				// remove the anchors
				anchorManager.deleteLines( annotations.filter( ann => ann instanceof LineAnnotation ) );

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
