/** @import { Camera, Scene, Ray, Vector3 } from 'three' */
import { Group, Matrix4 } from 'three';
import { MVTHierarchy } from './MVTHierarchy.js';
import { DelayedScreenOccupationManager } from './DelayedScreenOccupationManager.js';
import { SettlingManager } from './SettlingManager.js';
import { TextAnchorManager } from './TextAnchorManager.js';
import { OccupancyGridOverlay } from './debug/OccupancyGridOverlay.js';
import { LineAnnotationOverlay } from './debug/LineAnnotationOverlay.js';
import { LineAnnotation, parseLineFeature } from './annotations/LineAnnotation.js';
import { forEachTileInBounds, getMeshesCartographicRange } from '../images/overlays/utils.js';
import { parsePointFeature } from './annotations/PointAnnotation.js';
import { HierarchyOverlay } from './debug/HierarchyOverlay.js';
import { PointAnnotationManager } from './annotations/PointAnnotationManager.js';
import { TextAnchorAnnotation } from './annotations/TextAnchorAnnotation.js';
import { MVTIconGlyphs } from './MVTIconGlyphs.js';
import { MVTLabelGlyphs } from './MVTLabelGlyphs.js';
import { DeadlineTaskQueue } from './DeadlineTaskQueue.js';

// maximum driver-provided annotation rank in the packed sort value
const MAX_ANNOTATION_RANK = 4095;

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
 * @callback MVTRaycastCallback
 * @param {Ray} ray - The ray to cast, in world space.
 * @param {number} lat - Latitude of the sample, in radians.
 * @param {number} lon - Longitude of the sample, in radians.
 * @param {Vector3} target - Vector to write the resolved world-space hit point into.
 * @returns {boolean} True if a hit point was written to `target` and false to fall back to the default
 * ellipsoid-surface placement.
 */

/**
 * @callback MVTElevationSampleCallback
 * @param {number} lat - Latitude of the sample, in radians.
 * @param {number} lon - Longitude of the sample, in radians.
 * @returns {number|null} The elevation at the point, or null when no data covers it.
 */

/**
 * Bundles the callbacks the "MVTAnnotationsPlugin" needs into a single object. Subclass and override
 * the methods to customize which features become annotations, their placement priority, per-character
 * sizing, the displayed text, and how visibility changes are rendered. By default all points of interest
 * are rendered as circles and labels are rendered as white text with a black outline. Custom implementations
 * can be used for more sophisticated text rendering, variable font weights based on properties, and custom
 * icons.
 */
export class MVTAnnotationsDriver {

	/**
	 * Set to "true" when the filters or settings have changed to trigger an
	 * update to the annotations in the plugin.
	 * @type {boolean}
	 */
	set needsUpdate( v ) {

		if ( v ) {

			this.version ++;

		}

	}

	constructor() {

		/**
		 * Render group for the driver's own three.js objects. The plugin mounts it under
		 * `tiles.group` on `init` and removes it on `dispose`; add any objects the driver draws to it.
		 * @type {Group}
		 */
		this.group = new Group();

		/**
		 * Optional callback overriding the default surface raycast used when settling annotations
		 * onto the tile geometry, letting the caller analyze the hits and return a better point.
		 * Leave null to use the plugin's default raycasting.
		 * @type {MVTRaycastCallback|null}
		 */
		this.performSettleRaycast = null;

		/**
		 * Optional callback used to settle annotations by sampling elevations directly, which is
		 * much faster than raycasting. Takes precedence over any registered plugin providing
		 * "sampleCartographicElevation" while "performSettleRaycast" takes precedence over both.
		 * Leave null to use the plugin's default behavior.
		 * @type {MVTElevationSampleCallback|null}
		 */
		this.sampleCartographicElevation = null;

		this.version = 0;

	}

	/**
	 * Whether an MVT feature should be included as an annotation.
	 * @param {string} layer - The MVT layer name the feature belongs to.
	 * @param {Object} properties - The feature's property map.
	 * @param {number} type - The MVT geometry type: `1` = point, `2` = line.
	 * @returns {boolean} True to include the feature as an annotation.
	 */
	filterAnnotation( layer, properties, type ) {

		return false;

	}

	/**
	 * Placement priority for an annotation. Lower values are placed first and win collisions.
	 * Values are clamped to the [ 0, 4095 ] integer range.
	 * @param {Object} annotation - The annotation to prioritize.
	 * @returns {number} The placement priority.
	 */
	getAnnotationRank( annotation ) {

		return annotation.properties[ 'rank' ] ?? Infinity;

	}

	/**
	 * Advance width of a single character, in pixels, used to space glyphs along text labels.
	 * @param {string} char - The character to measure.
	 * @param {layer} layer - The layer associated with the text.
	 * @param {Object} properties - The properties associated with the text.
	 * @returns {number} The advance width in pixels.
	 */
	measureChar( char, layer, properties ) {

		return 1;

	}

	/**
	 * The string a line / road annotation should display for the given feature.
	 * @param {Object} properties - The feature's property map.
	 * @returns {string} The label text, or an empty string to render nothing.
	 */
	getText( properties ) {

		return properties.name ?? '';

	}

	/**
	 * Whether a parsed annotation should currently be displayed. Unlike `filterAnnotation` which
	 * decides what is parsed once.
	 * @param {string} layer - The MVT layer name the feature belongs to.
	 * @param {Object} properties - The feature's property map.
	 * @param {number} type - The MVT geometry type: `1` = point, `2` = line.
	 * @returns {boolean} True to display the annotation.
	 */
	isAnnotationEnabled( layer, properties, type ) {

		return true;

	}

	/**
	 * Called each frame with the point ( PoI ) annotations whose visibility changed, for the caller
	 * to render.
	 * @param {Object[]} added - Point annotations that became visible this frame.
	 * @param {Object[]} removed - Point annotations that became hidden this frame.
	 * @returns {void}
	 */
	onPointsUpdate( added, removed ) {}

	/**
	 * Called each frame with the line / label annotations whose visibility changed, for the caller
	 * to render.
	 * @param {Object[]} added - Label annotations that became visible this frame.
	 * @param {Object[]} removed - Label annotations that became hidden this frame.
	 * @returns {void}
	 */
	onLabelsUpdate( added, removed ) {}

	/**
	 * Releases any resources the driver created (geometries, materials, textures, etc.). Called by
	 * the plugin from its own `dispose`.
	 * @returns {void}
	 */
	dispose() {}

}

// split a mixed set of occupancy annotations into point ( PoI ) and label ( text anchor ) lists
function splitAnnotations( set ) {

	const points = [];
	const labels = [];
	for ( const item of set ) {

		if ( item instanceof TextAnchorAnnotation ) {

			labels.push( item );

		} else {

			points.push( item );

		}

	}

	return { points, labels };

}

/**
 * Ready-to-use driver so `new MVTAnnotationsPlugin( { overlay } )` displays something without any
 * setup. Every point feature is drawn as a filled white circle and every named line as white,
 * black-outlined Arial text. No feature filtering is applied. Supply a custom `MVTAnnotationsDriver`
 * to the plugin to override this behavior.
 * @private
 * @extends MVTAnnotationsDriver
 */
export class DefaultMVTAnnotationsDriver extends MVTAnnotationsDriver {

	constructor() {

		super();

		const dpr = window.devicePixelRatio;

		// a single filled circle glyph, used for every point annotation
		const icons = new MVTIconGlyphs( { fallback: 'default' } );
		icons.glyphAtlas.drawChar( 'default', '●', {
			fillStyle: 'white',
			strokeStyle: 'black',
			strokeWidth: 3 * dpr,
			font: '30px sans-serif',
		} );

		// white Arial road labels with a black outline
		const labels = new MVTLabelGlyphs( {
			fontFamily: 'Arial',
			strokeStyle: 'black',
			strokeWidth: 3 * dpr,
		} );

		this.group.add( icons, labels );
		this.icons = icons;
		this.labels = labels;

	}

	// include every feature
	filterAnnotation( layer, properties, type ) {

		return true;

	}

	measureChar( char, layer, properties ) {

		return this.labels.measureChar( char );

	}

	onPointsUpdate( added, removed ) {

		this.icons.update( added, removed );

	}

	onLabelsUpdate( added, removed ) {

		this.labels.update( added, removed );

	}

	dispose() {

		this.icons.dispose();
		this.labels.dispose();

	}

}

/**
 * Plugin that extracts point features from an MVT overlay and manages their screen-space
 * occupation, preventing label crowding via a hierarchical lock system and raycasted depth
 * placement. Rendering is left entirely to the caller via the driver's `onPointsUpdate` /
 * `onLabelsUpdate`.
 * @param {Object} options
 * @param {Object} options.overlay - The `PMTilesOverlay` (or compatible overlay) whose tile
 * content is parsed for point features.
 * @param {Camera} [options.camera=null] - Initial camera. Can be updated with `setCamera()`.
 * @param {MVTAnnotationsDriver} [options.driver] - Supplies the annotation callbacks: feature
 * filtering, placement priority, per-character sizing, and render updates. Cannot be changed
 * once initialized.
 * @param {number|null} [options.resolution=50] - Target resolution used when selecting the
 * vector tile level to load. This is equivalent to "resolution" value in ImageOverlayPlugin
 * used to drive loaded levels of detail for the overlays. Lower values load coarser tiles with
 * fewer annotations, independently of the shared overlay's own resolution. Set to null to use
 * the overlay resolution. Cannot be changed once initialized.
 */
export class MVTAnnotationsPlugin {

	get contentCache() {

		return this.overlay.imageSource._contentCache;

	}

	/**
	 * Time budget in milliseconds per frame for settling annotations onto the tile geometry.
	 * @type {number}
	 * @default 1
	 */
	get maxSettleTimeMs() {

		return this.settlingManager.maxSettleTimeMs;

	}

	set maxSettleTimeMs( v ) {

		this.settlingManager.maxSettleTimeMs = v;

	}

	/**
	 * Time budget in milliseconds per frame for the sliced occupancy layout pass.
	 * @type {number}
	 * @default 0.5
	 */
	get maxOccupancyUpdateTimeMs() {

		return this.occupancy.maxUpdateTimeMs;

	}

	set maxOccupancyUpdateTimeMs( v ) {

		this.occupancy.maxUpdateTimeMs = v;

	}

	/**
	 * Time budget in milliseconds per frame for parsing toggled vector tiles into annotations.
	 * @type {number}
	 * @default 1
	 */
	get maxParseTimeMs() {

		return this.toggleTileQueue.maxUpdateTimeMs;

	}

	set maxParseTimeMs( v ) {

		this.toggleTileQueue.maxUpdateTimeMs = v;

	}

	/**
	 * Hides annotations once `dot( surface normal, direction to camera )` falls below this, removing
	 * those near the horizon. Raise it to display annotations closer, set it to 0 to disable.
	 * @type {number}
	 * @default 0.1
	 */
	get horizonCutoff() {

		return this._horizonCutoff;

	}

	set horizonCutoff( value ) {

		// gated so this can be assigned every frame without traversing the annotations
		if ( value === this._horizonCutoff ) {

			return;

		}

		this._horizonCutoff = value;

		// TODO: A shared value for settings would be best here.
		this.pointManager.points.forEach( point => point.horizonCutoff = value );
		this.anchorManager.lines.forEach( line => line.horizonCutoff = value );

		// the cutoff is applied during layout, so it has to be redone
		this.occupancy.needsUpdate = true;

	}

	constructor( options = {} ) {

		// plugin fields
		this.priority = Infinity;
		this.name = 'MVT_ANNOTATIONS_PLUGIN';

		const {
			overlay,
			camera = null,
			driver = new DefaultMVTAnnotationsDriver(),
			resolution = 50,
			horizonCutoff = 0.1,
			useIdleCallback = true,
		} = options;

		// user settings
		this.overlay = overlay;
		this.camera = camera;
		this.driver = driver;
		this.resolution = resolution;
		this._horizonCutoff = horizonCutoff;

		/**
		 * Whether pending annotation work is additionally processed in idle callbacks between frames.
		 * @type {boolean}
		 * @default true
		 */
		this.useIdleCallback = useIdleCallback;
		this._idleCallbackHandle = - 1;

		// annotations call these live each frame so driver changes take effect immediately
		this._measureChar = char => this.driver.measureChar( char );
		this._filterAnnotation = ( layer, properties, type ) => this.driver.filterAnnotation( layer, properties, type );
		this._driverVersion = - 1;

		// hierarchy for managing tile loading and visibility
		this.hierarchy = new MVTHierarchy();
		this.occupancy = new DelayedScreenOccupationManager();
		this.anchorManager = new TextAnchorManager();
		this.pointManager = new PointAnnotationManager();
		this.settlingManager = new SettlingManager();
		this.tileLoadState = new Map();
		this.vectorTileInfo = new Map();

		this.toggleTileQueue = new DeadlineTaskQueue();

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

		// mount the driver's render group under the tile group
		tiles.group.add( this.driver.group );
		this.driver.group.updateMatrixWorld();

		const {
			overlay,
			occupancy,
			debug,
			hierarchy,
			settlingManager,
			contentCache,
			pointManager,
			anchorManager,
			toggleTileQueue,
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

		// TODO: remove after a deprecation period
		if ( this.driver.sortAnnotations ) {

			console.warn( 'MVTAnnotationsDriver: "sortAnnotations" has been deprecated. Implement "getAnnotationRank" instead.' );

		}

		// init occupancy
		// pack the sort priorities into a single value so the sort is a cheap numeric comparison.
		// TODO: The visibility flag and rank could be pre-assigned so this could just be converted to
		// a simple comparison cascade rather than a packed value.
		occupancy.sortValueCallback = item => {

			// currently visible items are prioritized first
			const visible = occupancy.visible.has( item ) ? 0 : 1;

			// user-provided rank
			const rank = Math.min( Math.max( Math.floor( this.driver.getAnnotationRank( item ) ), 0 ), MAX_ANNOTATION_RANK );

			return visible * ( MAX_ANNOTATION_RANK + 1 ) + rank;

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

			const { driver, camera, _measureChar } = this;
			const annotationsNeedUpdate = driver.version !== this._driverVersion;
			this._driverVersion = driver.version;

			if ( annotationsNeedUpdate ) {

				// Recalculate the field state per annotation
				for ( const annotation of pointManager.points ) {

					annotation.enabled = driver.isAnnotationEnabled( annotation.layer, annotation.properties, 1 );

				}

				for ( const line of anchorManager.lines ) {

					line.enabled = driver.isAnnotationEnabled( line.layer, line.properties, 2 );
					line.text = driver.getText( line.properties );
					line.updateCharacterWidthCache( _measureChar );

				}

				settlingManager.needsUpdate = true;
				occupancy.needsUpdate = true;

			}

			// sync camera and localToWorld matrix into occupancy grid
			if ( camera !== null ) {

				tiles.getResolution( camera, occupancy.resolution );
				occupancy.matrix.copy( tiles.group.matrixWorld );

			}

			// update all sub managers
			hierarchy.update();
			toggleTileQueue.update();

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

				occupancy.register( item );

			} );
			anchorManager.removed.forEach( item => {

				occupancy.unregister( item );

			} );
			anchorManager.reset();

			// mark the occupancy manager as needing an update if there is settling work to
			// be done.
			occupancy.needsUpdate = occupancy.needsUpdate || settlingManager.hasPendingWork;

			// Cache the one object used for elevation sampling so the settling samples don't have to
			// iterate over the plugins that may not provide the function. It's re-queried every frame
			// so a removed plugin isn't kept around and plugins can be added and removed at any time.
			// The driver's sampling function takes precedence over the registered plugins.
			settlingManager.camera = camera;
			settlingManager.performSettleRaycast = driver.performSettleRaycast;
			settlingManager.elevationSource = driver.sampleCartographicElevation !== null ?
				driver :
				tiles.plugins.find( plugin => plugin.sampleCartographicElevation ) || null;
			settlingManager.update();

			// occupancy
			occupancy.camera = camera;
			occupancy.update();

			// when the driver's filters changed, complete the sliced occupancy pass and force the
			// animations to completion so the change is applied at once rather than delayed
			if ( annotationsNeedUpdate ) {

				occupancy.flush();
				occupancy.finishAnimations();

			}

			// split the visibility changes by kind and notify the driver's renderers
			const added = splitAnnotations( occupancy.added );
			const removed = splitAnnotations( occupancy.removed );
			this.driver.onPointsUpdate( added.points, removed.points );
			this.driver.onLabelsUpdate( added.labels, removed.labels );

			if ( occupancy.added.size > 0 || occupancy.removed.size > 0 ) {

				tiles.dispatchEvent( { type: 'needs-render' } );

			}

			// clear the set of "added" and "removed" annotations once consumed since the following
			// "idle callback" run may fill it further so we have to clear explicitly.
			occupancy.reset();

			// if there's more work required the fire that we need to run during a subsequent frame and
			// try to run during an idle callback, queueing at most one at a time.
			if ( occupancy.hasPendingWork || settlingManager.hasPendingWork || toggleTileQueue.hasPendingWork ) {

				tiles.dispatchEvent( { type: 'needs-update' } );
				if ( this.useIdleCallback && this._idleCallbackHandle === - 1 ) {

					this._idleCallbackHandle = requestIdleCallback( deadline => {

						this._idleCallbackHandle = - 1;

						// mark the occupancy manager as needing an update if there is settling work to
						// be done.
						occupancy.needsUpdate = occupancy.needsUpdate || settlingManager.hasPendingWork;

						toggleTileQueue.update( deadline.timeRemaining() * 0.9 );
						settlingManager.update( deadline.timeRemaining() * 0.9 );
						occupancy.update( deadline.timeRemaining() * 0.9 );

					} );

				}

			}

			// debug
			debug.paths.camera = this.camera;
			debug.occupancy.update();
			debug.paths.update();
			debug.hierarchy.update();

		};

		// queue the tile so the parsing is amortized rather than landing in the frame that toggled it
		this._onVectorTileToggle = ( { x, y, level, visible } ) => {

			tiles.dispatchEvent( { type: 'needs-update' } );

			// "vectorTileInfo" holds the applied state
			const key = `${ x }_${ y }_${ level }`;
			if ( visible === this.vectorTileInfo.has( key ) ) {

				toggleTileQueue.delete( key );

			} else {

				toggleTileQueue.add( key, { x, y, level, visible } );

			}

		};

		this._onTileDownloadStart = ( { tile, url } ) => {

			// skip external tileset files since they are not geometry tiles
			if ( ! /\.json$/i.test( url ) && ! /\.subtree/i.test( url ) ) {

				this._initTileRange( tile );

			}

		};

		toggleTileQueue.callback = function* ( { x, y, level, visible }, isDeadlineComplete ) {

			const {
				contentCache,
				driver,
				vectorTileInfo,
				settlingManager,
				anchorManager,
				pointManager,
				_filterAnnotation,
				_measureChar,
			} = this;

			const key = `${ x }_${ y }_${ level }`;
			if ( visible ) {

				const { tiling } = overlay;
				const vectorTile = contentCache.get( x, y, level );

				if ( ! vectorTile ) {

					vectorTileInfo.set( key, { annotations: [] } );
					return;

				}

				// parse the annotations one feature at a time so each is only decoded once
				const annotations = [];
				const tileBounds = tiling.getTileBounds( x, y, level, true, false );
				const range = tiling.getTileBounds( x, y, level, false, false );
				for ( const layerName in vectorTile.layers ) {

					const layer = vectorTile.layers[ layerName ];
					for ( let i = 0; i < layer.length; i ++ ) {

						// pause between features once the time budget is spent
						if ( isDeadlineComplete() ) {

							yield;

						}

						const feature = layer.feature( i );
						const { type } = feature;
						if ( type !== 1 && type !== 2 ) {

							continue;

						}

						if ( ! _filterAnnotation( layerName, feature.properties, type ) ) {

							continue;

						}

						if ( type === 1 ) {

							parsePointFeature( feature, layerName, level, tileBounds, tiling, annotations );

						} else {

							parseLineFeature( feature, layerName, level, tileBounds, range, tiling, tiles.ellipsoid, annotations );

						}

					}

				}

				// registration runs uninterrupted so a cancellation can't strand partially
				// registered annotations
				const lines = [];
				for ( const ann of annotations ) {

					ann.horizonCutoff = this._horizonCutoff;

					if ( ann instanceof LineAnnotation ) {

						lines.push( ann );
						settlingManager.register( ann );
						ann.enabled = driver.isAnnotationEnabled( ann.layer, ann.properties, 2 );
						ann.text = driver.getText( ann.properties );
						ann.updateCharacterWidthCache( _measureChar );

					} else {

						pointManager.add( ann );
						ann.enabled = driver.isAnnotationEnabled( ann.layer, ann.properties, 1 );

					}

				}

				// add the anchors
				anchorManager.addLines( lines );

				// this MUST happen last with no yields after - the toggle queue cancellation logic
				// reads this key to tell whether the tile has been fully applied.
				vectorTileInfo.set( key, { annotations } );

			} else {

				const { annotations } = vectorTileInfo.get( key );
				vectorTileInfo.delete( key );

				const lines = [];
				for ( const item of annotations ) {

					if ( item instanceof LineAnnotation ) {

						lines.push( item );
						settlingManager.unregister( item );

					} else {

						pointManager.delete( item );

					}

				}

				// remove the anchors
				anchorManager.deleteLines( lines );

			}

		}.bind( this );

		// register events
		hierarchy.addEventListener( 'toggle', this._onVectorTileToggle );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );
		tiles.addEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.addEventListener( 'tile-download-start', this._onTileDownloadStart );

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

		const { debug, tiles, hierarchy, driver, settlingManager, toggleTileQueue, tileLoadState } = this;
		debug.occupancy.dispose();
		debug.paths.dispose();

		// unmount and dispose the driver's render group
		tiles.group.remove( driver.group );
		driver.dispose();

		hierarchy.removeEventListener( 'toggle', this._onVectorTileToggle );
		tiles.removeEventListener( 'update-after', this._onUpdateAfter );
		tiles.removeEventListener( 'tile-visibility-change', this._onVisibilityChange );
		tiles.removeEventListener( 'tile-download-start', this._onTileDownloadStart );

		// visible tiles are the ones currently marked in the hierarchy
		tileLoadState.forEach( ( range, tile ) => {

			if ( tiles.visibleTiles.has( tile ) ) {

				this._markVectorTile( tile, false );

			}

			this._prefetchVectorTile( tile, false );

		} );

		toggleTileQueue.clear();

		// cancel any pending idle callback so it can't run against the disposed plugin
		if ( this._idleCallbackHandle !== - 1 ) {

			cancelIdleCallback( this._idleCallbackHandle );
			this._idleCallbackHandle = - 1;

		}

		// release the cached elevation sampling plugin
		settlingManager.elevationSource = null;

	}

	disposeTile( tile ) {

		if ( this.tileLoadState.has( tile ) ) {

			this._prefetchVectorTile( tile, false );
			this.tileLoadState.delete( tile );

		}

	}

	async processTileModel( scene, tile ) {

		const { tiles, overlay } = this;

		// the range was already derived from the tile's region bounding volume on download start
		if ( this.tileLoadState.has( tile ) ) {

			return;

		}

		// The overlay's projection is not installed until it initializes, and until then it reports
		// a "none" projection that silently produces the wrong cartographic range here.
		if ( ! overlay.isReady ) {

			await overlay.whenReady();

		}

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
		this.tileLoadState.set( tile, range );

		// start the vector tiles loading as soon as the geometry is available rather than waiting
		// for the tile to be displayed, so the annotations are ready when it is
		this._prefetchVectorTile( tile, true );

	}

	//

	// Derive the tile's range from its region bounding volume so the vector tiles start loading
	// when the tile content download starts, before any geometry is available.
	_initTileRange( tile ) {

		const { overlay, tileLoadState } = this;
		if ( ! overlay.isReady || tileLoadState.has( tile ) || ! tile.boundingVolume.region ) {

			return;

		}

		// convert the cartographic region to the normalized range used by the overlay
		const [ minLon, minLat, maxLon, maxLat ] = tile.boundingVolume.region;
		let range = [ minLon, minLat, maxLon, maxLat ];
		range = overlay.projection.clampToBounds( range );
		range = overlay.projection.toNormalizedRange( range );

		tileLoadState.set( tile, range );
		this._prefetchVectorTile( tile, true );

	}

	// Holds or releases the vector tiles covering the given geometry tile so their content is
	// loaded before the tile is displayed.
	_prefetchVectorTile( tile, state ) {

		const range = this.tileLoadState.get( tile );
		this._forEachTileInBounds( range, ( x, y, l ) => {

			this.hierarchy.setPrefetchState( x, y, l, state );

		} );

	}

	_markVectorTile( tile, state ) {

		const range = this.tileLoadState.get( tile );
		this._forEachTileInBounds( range, ( x, y, l ) => {

			this.hierarchy.setTargetState( x, y, l, state );

		} );

	}

	_forEachTileInBounds( range, callback ) {

		// iterate over every mvt tile in the overlay
		const { overlay, resolution } = this;
		const { tiling } = overlay;
		const level = overlay.calculateLevel( range, resolution );

		if ( ! overlay.isReady ) {

			throw new Error( 'MVTAnnotationsPlugin: overlay is not ready.' );

		}

		forEachTileInBounds( range, level, tiling, callback );

	}

}
