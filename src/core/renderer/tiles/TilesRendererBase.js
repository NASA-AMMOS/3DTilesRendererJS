import { getUrlExtension } from '../utilities/urlExtension.js';
import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';
import { runTraversal as optimizedRunTraversal } from './optimizedTraverseFunctions.js';
import { runTraversal } from './traverseFunctions.js';
import { UNLOADED, QUEUED, LOADING, PARSING, LOADED, FAILED } from '../constants.js';
import { throttle } from '../utilities/throttle.js';
import { traverseSet } from '../utilities/TraversalUtils.js';

const PLUGIN_REGISTERED = Symbol( 'PLUGIN_REGISTERED' );
const regionErrorTarget = {
	inView: true,
	error: 0,
	distance: Infinity,
};

// priority queue sort function that takes two tiles to compare. Returning 1 means
// "tile a" is loaded first.
const defaultPriorityCallback = ( a, b ) => {

	const aPriority = a.priority || 0;
	const bPriority = b.priority || 0;

	if ( aPriority !== bPriority ) {

		// lower priority value sorts first
		return aPriority > bPriority ? 1 : - 1;

	} else if ( ! a.traversal || ! b.traversal ) {

		return 0;

	} else if ( a.traversal.used !== b.traversal.used ) {

		// load tiles that have been used
		return a.traversal.used ? 1 : - 1;

	} else if ( a.traversal.error !== b.traversal.error ) {

		// load the tile with the higher error
		return a.traversal.error > b.traversal.error ? 1 : - 1;

	} else if ( a.traversal.distanceFromCamera !== b.traversal.distanceFromCamera ) {

		// and finally visible tiles which have equal error (ex: if geometricError === 0)
		// should prioritize based on distance.
		return a.traversal.distanceFromCamera > b.traversal.distanceFromCamera ? - 1 : 1;

	} else if ( a.internal.depthFromRenderedParent !== b.internal.depthFromRenderedParent ) {

		return a.internal.depthFromRenderedParent > b.internal.depthFromRenderedParent ? - 1 : 1;

	}

	return 0;

};

// Optimized priority callback - prioritizes distance over error for better user experience
const optimizedPriorityCallback = ( a, b ) => {

	const aPriority = a.priority || 0;
	const bPriority = b.priority || 0;

	if ( aPriority !== bPriority ) {

		// lower priority value sorts first
		return aPriority > bPriority ? 1 : - 1;

	} else if ( ! a.traversal || ! b.traversal ) {

		return 0;

	} else if ( a.traversal.used !== b.traversal.used ) {

		// load tiles that have been used
		return a.traversal.used ? 1 : - 1;

	} else if ( a.traversal.inFrustum !== b.traversal.inFrustum ) {

		// load tiles that have are in the frustum
		return a.traversal.inFrustum ? 1 : - 1;

	} else if ( a.internal.hasUnrenderableContent !== b.internal.hasUnrenderableContent ) {

		// load internal tile sets first
		return a.internal.hasUnrenderableContent ? 1 : - 1;

	} else if ( a.traversal.distanceFromCamera !== b.traversal.distanceFromCamera ) {

		// load closer tiles first
		return a.traversal.distanceFromCamera > b.traversal.distanceFromCamera ? - 1 : 1;

	}

	return 0;

};

// lru cache unload callback that takes two tiles to compare. Returning 1 means "tile a"
// is unloaded first.
const lruPriorityCallback = ( a, b ) => {

	const aPriority = a.priority || 0;
	const bPriority = b.priority || 0;

	if ( aPriority !== bPriority ) {

		// lower priority value sorts first
		return aPriority > bPriority ? 1 : - 1;

	} else if ( ! a.traversal || ! b.traversal ) {

		return 0;

	} else if ( a.traversal.lastFrameVisited !== b.traversal.lastFrameVisited ) {

		// dispose of least recent tiles first
		return a.traversal.lastFrameVisited > b.traversal.lastFrameVisited ? - 1 : 1;

	} else if ( a.internal.depthFromRenderedParent !== b.internal.depthFromRenderedParent ) {

		// dispose of deeper tiles first so parents are not disposed before children
		return a.internal.depthFromRenderedParent > b.internal.depthFromRenderedParent ? 1 : - 1;

	} else if ( a.internal.loadingState !== b.internal.loadingState ) {

		// dispose of tiles that are earlier along in the loading process first
		return a.internal.loadingState > b.internal.loadingState ? - 1 : 1;

	} else if ( a.internal.hasUnrenderableContent !== b.internal.hasUnrenderableContent ) {

		// dispose of external tilesets last
		return a.internal.hasUnrenderableContent ? - 1 : 1;

	} else if ( a.traversal.error !== b.traversal.error ) {

		// unload the tile with lower error
		return a.traversal.error > b.traversal.error ? - 1 : 1;

	}

	return 0;

};

export class TilesRendererBase {

	get root() {

		const tileset = this.rootTileset;
		return tileset ? tileset.root : null;

	}

	get rootTileSet() {

		console.warn( 'TilesRenderer: "rootTileSet" has been deprecated. Use "rootTileset" instead.' );
		return this.rootTileset;

	}

	get loadProgress() {

		const { stats, isLoading } = this;
		const loading = stats.queued + stats.downloading + stats.parsing;
		const total = stats.inCacheSinceLoad + ( isLoading ? 1 : 0 );
		return total === 0 ? 1.0 : 1.0 - loading / total;

	}

	get errorThreshold() {

		return this._errorThreshold;

	}

	set errorThreshold( v ) {

		console.warn( 'TilesRenderer: The "errorThreshold" option has been deprecated.' );
		this._errorThreshold = v;

	}

	constructor( url = null ) {

		// state
		this.rootLoadingState = UNLOADED;
		this.rootTileset = null;
		this.rootURL = url;
		this.fetchOptions = {};
		this.plugins = [];
		this.queuedTiles = [];
		this.cachedSinceLoadComplete = new Set();
		this.isLoading = false;

		const lruCache = new LRUCache();
		lruCache.unloadPriorityCallback = lruPriorityCallback;

		const downloadQueue = new PriorityQueue();
		downloadQueue.maxJobs = 25;
		downloadQueue.priorityCallback = defaultPriorityCallback;

		const parseQueue = new PriorityQueue();
		parseQueue.maxJobs = 5;
		parseQueue.priorityCallback = defaultPriorityCallback;

		const processNodeQueue = new PriorityQueue();
		processNodeQueue.maxJobs = 25;
		processNodeQueue.priorityCallback = ( a, b ) => {

			const aParent = a.parent;
			const bParent = b.parent;
			if ( aParent === bParent ) {

				return 0;

			} else if ( ! aParent ) {

				return 1;

			} else if ( ! bParent ) {

				return - 1;

			} else {

				// fall back to the priority used for tile loads and parsing
				return downloadQueue.priorityCallback( aParent, bParent );

			}

		};

		this.processedTiles = new WeakSet();
		this.visibleTiles = new Set();
		this.activeTiles = new Set();
		this.usedSet = new Set();
		this.loadingTiles = new Set();
		this.lruCache = lruCache;
		this.downloadQueue = downloadQueue;
		this.parseQueue = parseQueue;
		this.processNodeQueue = processNodeQueue;
		this.stats = {
			inCacheSinceLoad: 0,
			inCache: 0,

			queued: 0,
			downloading: 0,
			parsing: 0,
			loaded: 0,
			failed: 0,

			inFrustum: 0,
			used: 0,
			active: 0,
			visible: 0,
		};
		this.frameCount = 0;

		// callbacks
		this._dispatchNeedsUpdateEvent = throttle( () => {

			this.dispatchEvent( { type: 'needs-update' } );

		} );

		// options
		this.errorTarget = 16.0;
		this._errorThreshold = Infinity;
		this.displayActiveTiles = false;
		this.maxDepth = Infinity;
		this.optimizedLoadStrategy = false;
		this.loadSiblings = true;

	}

	// Plugins
	registerPlugin( plugin ) {

		if ( plugin[ PLUGIN_REGISTERED ] === true ) {

			throw new Error( 'TilesRendererBase: A plugin can only be registered to a single tileset' );

		}

		// warn if plugin implements deprecated loadRootTileSet method
		if ( plugin.loadRootTileSet && ! plugin.loadRootTileset ) {

			console.warn( 'TilesRendererBase: Plugin implements deprecated "loadRootTileSet" method. Please rename to "loadRootTileset".' );
			plugin.loadRootTileset = plugin.loadRootTileSet;

		}

		if ( plugin.preprocessTileSet && ! plugin.preprocessTileset ) {

			console.warn( 'TilesRendererBase: Plugin implements deprecated "preprocessTileSet" method. Please rename to "preprocessTileset".' );
			plugin.preprocessTileset = plugin.preprocessTileSet;

		}

		// insert the plugin based on the priority registered on the plugin
		const plugins = this.plugins;
		const priority = plugin.priority || 0;
		let insertionPoint = plugins.length;
		for ( let i = 0; i < plugins.length; i ++ ) {

			const otherPriority = plugins[ i ].priority || 0;
			if ( otherPriority > priority ) {

				insertionPoint = i;
				break;

			}

		}

		plugins.splice( insertionPoint, 0, plugin );
		plugin[ PLUGIN_REGISTERED ] = true;
		if ( plugin.init ) {

			plugin.init( this );

		}

	}

	unregisterPlugin( plugin ) {

		const plugins = this.plugins;
		if ( typeof plugin === 'string' ) {

			plugin = this.getPluginByName( plugin );

		}

		if ( plugins.includes( plugin ) ) {

			const index = plugins.indexOf( plugin );
			plugins.splice( index, 1 );
			if ( plugin.dispose ) {

				plugin.dispose();

			}

			return true;

		}

		return false;

	}

	getPluginByName( name ) {

		return this.plugins.find( p => p.name === name ) || null;

	}

	invokeOnePlugin( func ) {

		const plugins = [ ...this.plugins, this ];
		for ( let i = 0; i < plugins.length; i ++ ) {

			const result = func( plugins[ i ] );
			if ( result ) {

				return result;

			}

		}

		return null;

	}

	invokeAllPlugins( func ) {

		const plugins = [ ...this.plugins, this ];
		const pending = [];
		for ( let i = 0; i < plugins.length; i ++ ) {

			const result = func( plugins[ i ] );
			if ( result ) {

				pending.push( result );

			}

		}

		return pending.length === 0 ? null : Promise.all( pending );

	}

	// Public API
	traverse( beforecb, aftercb, ensureFullyProcessed = true ) {

		if ( ! this.root ) return;

		traverseSet( this.root, ( tile, ...args ) => {

			if ( ensureFullyProcessed ) {

				this.ensureChildrenArePreprocessed( tile, true );

			}

			return beforecb ? beforecb( tile, ...args ) : false;

		}, aftercb );

	}

	getAttributions( target = [] ) {

		this.invokeAllPlugins( plugin => plugin !== this && plugin.getAttributions && plugin.getAttributions( target ) );
		return target;

	}

	update() {

		// load root
		const { lruCache, usedSet, stats, root, downloadQueue, parseQueue, processNodeQueue, optimizedLoadStrategy } = this;
		if ( this.rootLoadingState === UNLOADED ) {

			this.rootLoadingState = LOADING;
			this.invokeOnePlugin( plugin => plugin.loadRootTileset && plugin.loadRootTileset() )
				.then( root => {

					let processedUrl = this.rootURL;
					if ( processedUrl !== null ) {

						this.invokeAllPlugins( plugin => processedUrl = plugin.preprocessURL ? plugin.preprocessURL( processedUrl, null ) : processedUrl );

					}

					this.rootLoadingState = LOADED;
					this.rootTileset = root;
					this.dispatchEvent( { type: 'needs-update' } );
					this.dispatchEvent( { type: 'load-content' } );
					this.dispatchEvent( {
						type: 'load-tileset',
						tileset: root,
						url: processedUrl,
					} );
					this.dispatchEvent( {
						type: 'load-root-tileset',
						tileset: root,
						url: processedUrl,
					} );

				} )
				.catch( error => {

					this.rootLoadingState = FAILED;
					console.error( error );

					this.rootTileset = null;
					this.dispatchEvent( {
						type: 'load-error',
						tile: null,
						error,
						url: this.rootURL,
					} );

				} );

		}

		if ( ! root ) {

			return;

		}

		// check if the plugins that can block the tile updates require it
		let needsUpdate = null;
		this.invokeAllPlugins( plugin => {

			if ( plugin.doTilesNeedUpdate ) {

				const res = plugin.doTilesNeedUpdate();
				if ( needsUpdate === null ) {

					needsUpdate = res;

				} else {

					needsUpdate = Boolean( needsUpdate || res );

				}

			}

		} );

		if ( needsUpdate === false ) {

			this.dispatchEvent( { type: 'update-before' } );
			this.dispatchEvent( { type: 'update-after' } );
			return;

		}

		// follow through with the update
		this.dispatchEvent( { type: 'update-before' } );

		//

		stats.inFrustum = 0;
		stats.used = 0;
		stats.active = 0;
		stats.visible = 0;
		this.frameCount ++;

		usedSet.forEach( tile => lruCache.markUnused( tile ) );
		usedSet.clear();

		// assign the correct callbacks
		const priorityCallback = optimizedLoadStrategy ? optimizedPriorityCallback : defaultPriorityCallback;
		downloadQueue.priorityCallback = priorityCallback;
		parseQueue.priorityCallback = priorityCallback;

		// prepare for traversal
		this.prepareForTraversal();

		// run traversal
		if ( optimizedLoadStrategy ) {

			optimizedRunTraversal( root, this );

		} else {

			runTraversal( root, this );

		}

		// remove any tiles that are loading but no longer used
		this.removeUnusedPendingTiles();

		// TODO: This will only sort for one tileset. We may want to store this queue on the
		// LRUCache so multiple tilesets can use it at once
		// start the downloads of the tiles as needed
		const queuedTiles = this.queuedTiles;
		queuedTiles.sort( lruCache.unloadPriorityCallback );
		for ( let i = 0, l = queuedTiles.length; i < l && ! lruCache.isFull(); i ++ ) {

			this.requestTileContents( queuedTiles[ i ] );

		}

		queuedTiles.length = 0;

		// start the downloads
		lruCache.scheduleUnload();

		// if all tasks have finished and we've been marked as actively loading then fire the completion event
		const runningTasks = downloadQueue.running || parseQueue.running || processNodeQueue.running;
		if ( runningTasks === false && this.isLoading === true ) {

			this.cachedSinceLoadComplete.clear();
			stats.inCacheSinceLoad = 0;

			this.dispatchEvent( { type: 'tiles-load-end' } );
			this.isLoading = false;

		}

		this.dispatchEvent( { type: 'update-after' } );

	}

	resetFailedTiles() {

		// reset the root tile if it's finished but never loaded
		if ( this.rootLoadingState === FAILED ) {

			this.rootLoadingState = UNLOADED;

		}

		const stats = this.stats;
		if ( stats.failed === 0 ) {

			return;

		}

		this.traverse( tile => {

			if ( tile.internal.loadingState === FAILED ) {

				tile.internal.loadingState = UNLOADED;

			}

		}, null, false );

		stats.failed = 0;

	}

	calculateTileViewErrorWithPlugin( tile, target ) {

		// calculate camera view error
		this.calculateTileViewError( tile, target );

		// TODO: this logic is extremely complex. It may be more simple to have the plugin
		// return a "should mask" field that indicates its "false" values should be respected
		// rather than the function returning a "no-op" boolean.
		// check the plugin visibility - each plugin will mask between themselves
		let inRegion = null;
		let inRegionError = 0;
		let inRegionDistance = Infinity;
		this.invokeAllPlugins( plugin => {

			if ( plugin !== this && plugin.calculateTileViewError ) {

				// if function returns false it means "no operation"
				regionErrorTarget.inView = true;
				regionErrorTarget.error = 0;
				regionErrorTarget.distance = Infinity;
				if ( plugin.calculateTileViewError( tile, regionErrorTarget ) ) {

					if ( inRegion === null ) {

						inRegion = true;

					}

					// Plugins can set "inView" to false in order to mask the visible tiles
					inRegion = inRegion && regionErrorTarget.inView;
					if ( regionErrorTarget.inView ) {

						inRegionDistance = Math.min( inRegionDistance, regionErrorTarget.distance );
						inRegionError = Math.max( inRegionError, regionErrorTarget.error );

					}

				}

			}

		} );

		if ( target.inView && inRegion !== false ) {

			// if the tile is in camera view and we haven't encountered a region (null) or
			// the region is in view (true). regionInView === false means the tile is masked out.
			target.error = Math.max( target.error, inRegionError );
			target.distanceFromCamera = Math.min( target.distanceFromCamera, inRegionDistance );

		} else if ( inRegion ) {

			// if the tile is in a region then display it
			target.inView = true;
			target.error = inRegionError;
			target.distanceFromCamera = inRegionDistance;

		} else {

			// otherwise write variables for load priority
			target.inView = false;

		}

	}

	dispose() {

		// dispose of all the plugins
		const plugins = [ ...this.plugins ];
		plugins.forEach( plugin => {

			this.unregisterPlugin( plugin );

		} );

		const lruCache = this.lruCache;

		// Make sure we've collected all children before disposing of the internal tilesets to avoid
		// dangling children that we inadvertantly skip when deleting the nested tileset.
		const toRemove = [];
		this.traverse( t => {

			toRemove.push( t );
			return false;

		}, null, false );
		for ( let i = 0, l = toRemove.length; i < l; i ++ ) {

			lruCache.remove( toRemove[ i ] );

		}

		this.stats = {
			queued: 0,
			parsing: 0,
			downloading: 0,
			failed: 0,
			inFrustum: 0,
			traversed: 0,
			used: 0,
			active: 0,
			visible: 0,
		};
		this.frameCount = 0;
		this.loadingTiles.clear();

	}

	// Overrideable
	calculateBytesUsed( scene, tile ) {

		return 0;

	}

	dispatchEvent( e ) {}

	addEventListener( name, callback ) {}

	removeEventListener( name, callback ) {}

	parseTile( buffer, tile, extension ) {

		return null;

	}

	prepareForTraversal() {}

	disposeTile( tile ) {

		// TODO: are these necessary? Are we disposing tiles when they are currently visible?
		if ( tile.traversal.visible ) {

			this.invokeOnePlugin( plugin => plugin.setTileVisible && plugin.setTileVisible( tile, false ) );
			tile.traversal.visible = false;

		}

		if ( tile.traversal.active ) {

			this.invokeOnePlugin( plugin => plugin.setTileActive && plugin.setTileActive( tile, false ) );
			tile.traversal.active = false;

		}

		const { scene } = tile.engineData;
		if ( scene ) {

			this.dispatchEvent( {
				type: 'dispose-model',
				scene,
				tile,
			} );

		}

	}

	preprocessNode( tile, tilesetDir, parentTile = null ) {

		this.processedTiles.add( tile );

		if ( tile.content ) {

			// Fix old file formats
			if ( ! ( 'uri' in tile.content ) && 'url' in tile.content ) {

				tile.content.uri = tile.content.url;
				delete tile.content.url;

			}

			// NOTE: fix for some cases where tilesets provide the bounding volume
			// but volumes are not present.
			if (
				tile.content.boundingVolume &&
				! (
					'box' in tile.content.boundingVolume ||
					'sphere' in tile.content.boundingVolume ||
					'region' in tile.content.boundingVolume
				)
			) {

				delete tile.content.boundingVolume;

			}

		}

		tile.parent = parentTile;
		tile.children = tile.children || [];

		// Initialize internal data
		tile.internal = {
			hasContent: false,
			hasRenderableContent: false,
			hasUnrenderableContent: false,
			loadingState: UNLOADED,
			basePath: tilesetDir,
			childrenProcessed: 0,
			depth: - 1,
			depthFromRenderedParent: - 1,
		};

		if ( tile.content?.uri ) {

			// "content" should only indicate loadable meshes, not external tilesets
			const extension = getUrlExtension( tile.content.uri );
			const hasUnrenderableContent = Boolean( extension && /json$/.test( extension ) );
			tile.internal.hasContent = true;
			tile.internal.hasUnrenderableContent = hasUnrenderableContent;
			tile.internal.hasRenderableContent = ! hasUnrenderableContent;

		} else {

			tile.internal.hasContent = false;
			tile.internal.hasUnrenderableContent = false;
			tile.internal.hasRenderableContent = false;

		}

		// Increment parent's children processed counter
		if ( parentTile ) {

			parentTile.internal.childrenProcessed ++;
			tile.internal.depth = parentTile.internal.depth + 1;
			tile.internal.depthFromRenderedParent = parentTile.internal.depthFromRenderedParent + ( tile.internal.hasRenderableContent ? 1 : 0 );

		} else {

			tile.internal.depth = 0;
			tile.internal.depthFromRenderedParent = tile.internal.hasRenderableContent ? 1 : 0;

		}

		// Initialize traversal data
		tile.traversal = {
			distanceFromCamera: Infinity,
			error: Infinity,
			inFrustum: false,
			isLeaf: false,
			used: false,
			usedLastFrame: false,
			visible: false,
			wasSetVisible: false,
			active: false,
			wasSetActive: false,
			allChildrenReady: false,
			kicked: false,
			allUsedChildrenProcessed: false,
			lastFrameVisited: - 1,
		};

		if ( parentTile === null ) {

			tile.refine = tile.refine || 'REPLACE';

		} else {

			tile.refine = tile.refine || parentTile.refine;

		}

		// Initialize engineData data structure with engine-agnostic fields
		tile.engineData = {
			scene: null,
			metadata: null,
			boundingVolume: null,
		};

		// Backwards compatibility: cached is an alias for engineData
		Object.defineProperty( tile, 'cached', {
			get() {

				console.warn( 'TilesRenderer: "tile.cached" field has been renamed to "tile.engineData".' );
				return this.engineData;

			},
			enumerable: false,
			configurable: true,
		} );

		this.invokeAllPlugins( plugin => {

			plugin !== this && plugin.preprocessNode && plugin.preprocessNode( tile, tilesetDir, parentTile );

		} );

	}

	setTileActive( tile, active ) {

		active ? this.activeTiles.add( tile ) : this.activeTiles.delete( tile );

	}

	setTileVisible( tile, visible ) {

		visible ? this.visibleTiles.add( tile ) : this.visibleTiles.delete( tile );

		this.dispatchEvent( {
			type: 'tile-visibility-change',
			scene: tile.engineData.scene,
			tile,
			visible,
		} );


	}

	calculateTileViewError( tile, target ) {

		// retrieve whether the tile is visible, screen space error, and distance to camera
		// set "inView", "error", "distance"

	}

	removeUnusedPendingTiles() {

		const { lruCache, loadingTiles } = this;

		// cannot delete items while iterating over a set
		const toRemove = [];
		for ( const tile of loadingTiles ) {

			// we only remove tiles that are QUEUED to avoid cancelling tiles that may already be nearly downloaded
			// as the camera moves
			if ( ! lruCache.isUsed( tile ) && tile.internal.loadingState === QUEUED ) {

				toRemove.push( tile );

			}

		}

		for ( let i = 0; i < toRemove.length; i ++ ) {

			lruCache.remove( toRemove[ i ] );

		}

	}

	// Private Functions
	queueTileForDownload( tile ) {

		if ( tile.internal.loadingState !== UNLOADED || this.lruCache.isFull() ) {

			return;

		}

		this.queuedTiles.push( tile );

	}

	markTileUsed( tile ) {

		// save the tile in a separate "used set" so we can mark it as unused
		// before the next tileset traversal
		this.usedSet.add( tile );
		this.lruCache.markUsed( tile );

	}

	fetchData( url, options ) {

		return fetch( url, options );

	}

	ensureChildrenArePreprocessed( tile, immediate = false ) {

		const children = tile.children;
		if ( tile.internal.childrenProcessed === children.length ) {

			return;

		}

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const child = children[ i ];
			if ( 'traversal' in child ) {

				// the child has already been processed
				continue;

			} else if ( immediate ) {

				// process the node immediately and make sure we don't double process it
				this.processNodeQueue.remove( child );
				this.preprocessNode( child, tile.internal.basePath, tile );

			} else {

				// queue the node for processing if it hasn't been already
				if ( ! this.processNodeQueue.has( child ) ) {

					this.processNodeQueue.add( child, child => {

						this.preprocessNode( child, tile.internal.basePath, tile );
						this._dispatchNeedsUpdateEvent();

					} );

				}

			}

		}

	}

	// returns the total bytes used for by the given tile as reported by all plugins
	getBytesUsed( tile ) {

		let bytes = 0;
		this.invokeAllPlugins( plugin => {

			if ( plugin.calculateBytesUsed ) {

				bytes += plugin.calculateBytesUsed( tile, tile.engineData.scene ) || 0;

			}

		} );

		return bytes;

	}

	// force a recalculation of the tile or all tiles if no tile is provided
	recalculateBytesUsed( tile = null ) {

		const { lruCache, processedTiles } = this;
		if ( tile === null ) {

			lruCache.itemSet.forEach( item => {

				if ( processedTiles.has( item ) ) {

					lruCache.setMemoryUsage( item, this.getBytesUsed( item ) );

				}

			} );

		} else {

			lruCache.setMemoryUsage( tile, this.getBytesUsed( tile ) );

		}

	}

	preprocessTileset( json, url, parent = null ) {

		// check for deprecated function usage
		const proto = Object.getPrototypeOf( this );
		if ( Object.hasOwn( proto, 'preprocessTileSet' ) ) {

			console.warn( `${ proto.constructor.name }: Class overrides deprecated "preprocessTileSet" method. Please rename to "preprocessTileset".` );

		}

		const version = json.asset.version;
		const [ major, minor ] = version.split( '.' ).map( v => parseInt( v ) );
		console.assert(
			major <= 1,
			'TilesRenderer: asset.version is expected to be a 1.x or a compatible version.',
		);

		if ( major === 1 && minor > 0 ) {

			console.warn( 'TilesRenderer: tiles versions at 1.1 or higher have limited support. Some new extensions and features may not be supported.' );

		}

		// remove the last file path path-segment from the URL including the trailing slash
		let basePath = url.replace( /\/[^/]*$/, '' );
		basePath = new URL( basePath, window.location.href ).toString();
		this.preprocessNode( json.root, basePath, parent );

	}

	preprocessTileSet( ...args ) {

		console.warn( 'TilesRenderer: "preprocessTileSet" has been deprecated. Use "preprocessTileset" instead.' );
		return this.preprocessTileset( ...args );

	}

	loadRootTileset() {

		// check for deprecated function usage
		const proto = Object.getPrototypeOf( this );
		if ( Object.hasOwn( proto, 'loadRootTileSet' ) ) {

			console.warn( `${ proto.constructor.name }: Class overrides deprecated "loadRootTileSet" method. Please rename to "loadRootTileset".` );

		}

		// transform the url
		let processedUrl = this.rootURL;
		this.invokeAllPlugins( plugin => processedUrl = plugin.preprocessURL ? plugin.preprocessURL( processedUrl, null ) : processedUrl );

		// load the tileset root
		const pr = this
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( processedUrl, this.fetchOptions ) )
			.then( res => {

				if ( ! ( res instanceof Response ) ) {

					return res;

				} else if ( res.ok ) {

					return res.json();

				} else {

					throw new Error( `TilesRenderer: Failed to load tileset "${ processedUrl }" with status ${ res.status } : ${ res.statusText }` );

				}

			} )
			.then( root => {

				this.preprocessTileset( root, processedUrl );
				return root;

			} );

		return pr;

	}

	loadRootTileSet( ...args ) {

		console.warn( 'TilesRenderer: "loadRootTileSet" has been deprecated. Use "loadRootTileset" instead.' );
		return this.loadRootTileSet( ...args );

	}

	requestTileContents( tile ) {

		// If the tile is already being loaded then don't
		// start it again.
		if ( tile.internal.loadingState !== UNLOADED ) {

			return;

		}

		let isExternalTileset = false;
		let externalTileset = null;
		let uri = new URL( tile.content.uri, tile.internal.basePath + '/' ).toString();
		this.invokeAllPlugins( plugin => uri = plugin.preprocessURL ? plugin.preprocessURL( uri, tile ) : uri );

		const stats = this.stats;
		const lruCache = this.lruCache;
		const downloadQueue = this.downloadQueue;
		const parseQueue = this.parseQueue;
		const loadingTiles = this.loadingTiles;
		const extension = getUrlExtension( uri );

		// track an abort controller and pass-through the below conditions if aborted
		const controller = new AbortController();
		const signal = controller.signal;
		const addedSuccessfully = lruCache.add( tile, t => {

			// Stop the load if it's started
			controller.abort();

			// Clear out all tile content
			if ( isExternalTileset ) {

				t.children.length = 0;
				t.internal.childrenProcessed = 0;

			} else {

				this.invokeAllPlugins( plugin => {

					plugin.disposeTile && plugin.disposeTile( t );

				} );

			}

			// Decrement stats
			stats.inCache --;
			if ( this.cachedSinceLoadComplete.has( tile ) ) {

				this.cachedSinceLoadComplete.delete( tile );
				stats.inCacheSinceLoad --;

			}

			if ( t.internal.loadingState === QUEUED ) {

				stats.queued --;

			} else if ( t.internal.loadingState === LOADING ) {

				stats.downloading --;

			} else if ( t.internal.loadingState === PARSING ) {

				stats.parsing --;

			} else if ( t.internal.loadingState === LOADED ) {

				stats.loaded --;

			}

			t.internal.loadingState = UNLOADED;

			parseQueue.remove( t );
			downloadQueue.remove( t );
			loadingTiles.delete( t );

		} );

		// if we couldn't add the tile to the lru cache because it's full then skip
		if ( ! addedSuccessfully ) {

			return;

		}

		// check if this is the beginning of a new set of tiles to load and dispatch and event
		if ( ! this.isLoading ) {

			this.isLoading = true;
			this.dispatchEvent( { type: 'tiles-load-start' } );

		}

		lruCache.setMemoryUsage( tile, this.getBytesUsed( tile ) );
		this.cachedSinceLoadComplete.add( tile );
		stats.inCacheSinceLoad ++;
		stats.inCache ++;
		stats.queued ++;
		tile.internal.loadingState = QUEUED;
		loadingTiles.add( tile );

		// queue the download and parse
		return downloadQueue.add( tile, downloadTile => {

			if ( signal.aborted ) {

				return Promise.resolve();

			}

			tile.internal.loadingState = LOADING;
			stats.downloading ++;
			stats.queued --;

			const res = this.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( uri, { ...this.fetchOptions, signal } ) );
			this.dispatchEvent( { type: 'tile-download-start', tile, uri } );
			return res;

		} )
			.then( res => {

				if ( signal.aborted ) {

					return;

				}

				if ( ! ( res instanceof Response ) ) {

					return res;

				} else if ( res.ok ) {

					return extension === 'json' ? res.json() : res.arrayBuffer();

				} else {

					throw new Error( `Failed to load model with error code ${res.status}` );

				}

			} )
			.then( content => {

				// if it has been unloaded then the tile has been disposed
				if ( signal.aborted ) {

					return;

				}

				stats.downloading --;
				stats.parsing ++;
				tile.internal.loadingState = PARSING;

				return parseQueue.add( tile, parseTile => {

					// if it has been unloaded then the tile has been disposed
					if ( signal.aborted ) {

						return Promise.resolve();

					}

					if ( extension === 'json' && content.root ) {

						this.preprocessTileset( content, uri, tile );
						tile.children.push( content.root );
						externalTileset = content;
						isExternalTileset = true;
						return Promise.resolve();

					} else {

						return this.invokeOnePlugin( plugin => plugin.parseTile && plugin.parseTile( content, parseTile, extension, uri, signal ) );

					}

				} );

			} )
			.then( () => {

				// if it has been unloaded then the tile has been disposed
				if ( signal.aborted ) {

					return;

				}

				stats.parsing --;
				stats.loaded ++;
				tile.internal.loadingState = LOADED;
				loadingTiles.delete( tile );
				lruCache.setLoaded( tile, true );

				// If the memory of the item hasn't been registered yet then that means the memory usage hasn't
				// been accounted for by the cache yet so we need to check if it fits or if we should remove it.
				const bytesUsed = this.getBytesUsed( tile );
				if ( lruCache.getMemoryUsage( tile ) === 0 && bytesUsed > 0 && lruCache.isFull() ) {

					// And if the cache is full due to newly loaded memory then lets discard this tile - it will
					// be loaded again later from the disk cache if needed.
					lruCache.remove( tile );
					return;

				}

				// update memory
				lruCache.setMemoryUsage( tile, bytesUsed );

				// dispatch an event indicating that this model has completed and that a new
				// call to "update" is needed.
				this.dispatchEvent( { type: 'needs-update' } );
				this.dispatchEvent( { type: 'load-content' } );
				if ( isExternalTileset ) {

					this.dispatchEvent( {
						type: 'load-tileset',
						tileset: externalTileset,
						url: uri,
					} );

				}

				if ( tile.engineData.scene ) {

					this.dispatchEvent( {
						type: 'load-model',
						scene: tile.engineData.scene,
						tile,
						url: uri,
					} );

				}

			} )
			.catch( error => {

				// if it has been unloaded then the tile has been disposed
				if ( signal.aborted ) {

					return;

				}

				if ( error.name !== 'AbortError' ) {

					parseQueue.remove( tile );
					downloadQueue.remove( tile );

					if ( tile.internal.loadingState === QUEUED ) {

						stats.queued --;

					} else if ( tile.internal.loadingState === LOADING ) {

						stats.downloading --;

					} else if ( tile.internal.loadingState === PARSING ) {

						stats.parsing --;

					} else if ( tile.internal.loadingState === LOADED ) {

						stats.loaded --;

					}

					stats.failed ++;

					console.error( `TilesRenderer : Failed to load tile at url "${ tile.content.uri }".` );
					console.error( error );
					tile.internal.loadingState = FAILED;
					loadingTiles.delete( tile );
					lruCache.setLoaded( tile, true );

					this.dispatchEvent( {
						type: 'load-error',
						tile,
						error,
						url: uri,
					} );

				} else {

					lruCache.remove( tile );

				}

			} );

	}

}
