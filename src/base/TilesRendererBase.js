import { getUrlExtension } from '../utilities/urlExtension.js';
import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';
import { markUsedTiles, toggleTiles, markVisibleTiles, markUsedSetLeaves, traverseSet } from './traverseFunctions.js';
import { UNLOADED, LOADING, PARSING, LOADED, FAILED } from './constants.js';

const PLUGIN_REGISTERED = Symbol( 'PLUGIN_REGISTERED' );

// priority queue sort function that takes two tiles to compare. Returning 1 means
// "tile a" is loaded first.
const priorityCallback = ( a, b ) => {

	if ( a.__depthFromRenderedParent !== b.__depthFromRenderedParent ) {

		// load shallower tiles first using "depth from rendered parent" to help
		// even out depth disparities caused by non-content parent tiles
		return a.__depthFromRenderedParent > b.__depthFromRenderedParent ? - 1 : 1;

	} else if ( a.__inFrustum !== b.__inFrustum ) {

		// load tiles that are in the frustum at the current depth
		return a.__inFrustum ? 1 : - 1;

	} else if ( a.__used !== b.__used ) {

		// load tiles that have been used
		return a.__used ? 1 : - 1;

	} else if ( a.__error !== b.__error ) {

		// load the tile with the higher error
		return a.__error > b.__error ? 1 : - 1;

	} else if ( a.__distanceFromCamera !== b.__distanceFromCamera ) {

		// and finally visible tiles which have equal error (ex: if geometricError === 0)
		// should prioritize based on distance.
		return a.__distanceFromCamera > b.__distanceFromCamera ? - 1 : 1;

	}

	return 0;

};

// lru cache unload callback that takes two tiles to compare. Returning 1 means "tile a"
// is unloaded first.
const lruPriorityCallback = ( a, b ) => {

	if ( a.__depthFromRenderedParent !== b.__depthFromRenderedParent ) {

		// dispose of deeper tiles first
		return a.__depthFromRenderedParent > b.__depthFromRenderedParent ? 1 : - 1;

	} else if ( a.__loadingState !== b.__loadingState ) {

		// dispose of tiles that are earlier along in the loading process first
		return a.__loadingState > b.__loadingState ? - 1 : 1;

	} else if ( a.__lastFrameVisited !== b.__lastFrameVisited ) {

		// dispose of least recent tiles first
		return a.__lastFrameVisited > b.__lastFrameVisited ? - 1 : 1;

	} else if ( a.__hasUnrenderableContent !== b.__hasUnrenderableContent ) {

		// dispose of external tile sets last
		return a.__hasUnrenderableContent ? - 1 : 1;

	} else if ( a.__error !== b.__error ) {

		// unload the tile with lower error
		return a.__error > b.__error ? - 1 : 1;

	}

	return 0;

};

export class TilesRendererBase {

	get root() {

		const tileSet = this.rootTileSet;
		return tileSet ? tileSet.root : null;

	}

	set loadSiblings( v ) {

		console.warn( 'TilesRenderer: "loadSiblings" option has been removed.' );

	}

	set stopAtEmptyTiles( v ) {

		console.warn( 'TilesRenderer: "stopAtEmptyTiles" option has been removed.' );

	}

	set preprocessURL( v ) {

		console.warn( 'TilesRendererBase: The "preprocessURL" callback has been deprecated. Use a plugin, instead.' );
		this._preprocessURL = v;

	}

	get preprocessURL() {

		return this._preprocessURL;

	}

	constructor( url = null ) {

		// state
		this.rootTileSetTriggered = false;
		this.rootTileSet = null;
		this.rootURL = url;
		this.fetchOptions = {};
		this.plugins = [];
		this.queuedTiles = [];

		this._preprocessURL = null;

		const lruCache = new LRUCache();
		lruCache.unloadPriorityCallback = lruPriorityCallback;

		const downloadQueue = new PriorityQueue();
		downloadQueue.maxJobs = 10;
		downloadQueue.priorityCallback = priorityCallback;

		const parseQueue = new PriorityQueue();
		parseQueue.maxJobs = 1;
		parseQueue.priorityCallback = priorityCallback;

		this.lruCache = lruCache;
		this.downloadQueue = downloadQueue;
		this.parseQueue = parseQueue;
		this.stats = {
			parsing: 0,
			downloading: 0,
			failed: 0,
			inFrustum: 0,
			used: 0,
			active: 0,
			visible: 0,
		};
		this.frameCount = 0;

		// options
		this.errorTarget = 6.0;
		this.errorThreshold = Infinity;
		this.displayActiveTiles = false;
		this.maxDepth = Infinity;

	}

	// Plugins
	registerPlugin( plugin ) {

		if ( plugin[ PLUGIN_REGISTERED ] === true ) {

			throw new Error( 'TilesRendererBase: A plugin can only be registered to a single tile set' );

		}

		this.plugins.push( plugin );
		plugin[ PLUGIN_REGISTERED ] = true;
		if ( plugin.init ) {

			plugin.init( this );

		}

	}

	unregisterPlugin( plugin ) {

		const plugins = this.plugins;
		if ( typeof plugin === 'string' ) {

			plugin = this.getPluginByName( name );

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

	traverse( beforecb, aftercb ) {

		if ( ! this.root ) return;

		traverseSet( this.root, ( tile, ...args ) => {

			this.ensureChildrenArePreprocessed( tile );
			return beforecb ? beforecb( tile, ...args ) : false;

		}, aftercb );

	}

	queueTileForDownload( tile ) {

		this.queuedTiles.push( tile );

	}

	// Public API
	update() {

		const stats = this.stats;
		const lruCache = this.lruCache;
		if ( ! this.rootTileSetTriggered ) {

			this.rootTileSetTriggered = true;
			this.invokeOnePlugin( plugin => plugin.loadRootTileSet && plugin.loadRootTileSet() );

		}

		if ( ! this.root ) {

			return;

		}

		const root = this.root;

		stats.inFrustum = 0;
		stats.used = 0;
		stats.active = 0;
		stats.visible = 0;
		this.frameCount ++;

		markUsedTiles( root, this );
		markUsedSetLeaves( root, this );
		markVisibleTiles( root, this );
		toggleTiles( root, this );

		// TODO: This will only sort for one tile set. We may want to store this queue on the
		// LRUCache so multiple tile sets can use it at once
		// start the downloads of the tiles as needed
		const queuedTiles = this.queuedTiles;
		queuedTiles.sort( lruCache.unloadPriorityCallback );
		for ( let i = 0, l = queuedTiles.length; i < l && ! lruCache.isFull(); i ++ ) {

			this.requestTileContents( queuedTiles[ i ] );

		}

		queuedTiles.length = 0;

		// start the downloads
		lruCache.scheduleUnload();

	}

	resetFailedTiles() {

		const stats = this.stats;
		if ( stats.failed === 0 ) {

			return;

		}

		this.traverse( tile => {

			if ( tile.__loadingState === FAILED ) {

				tile.__loadingState = UNLOADED;

			}

		} );

		stats.failed = 0;

	}

	dispose() {

		// dispose of all the plugins
		this.invokeAllPlugins( plugin => {

			plugin !== this && plugin.dispose && plugin.dispose();

		} );

		const lruCache = this.lruCache;

		// Make sure we've collected all children before disposing of the internal tilesets to avoid
		// dangling children that we inadvertantly skip when deleting the nested tileset.
		const toRemove = [];
		this.traverse( t => {

			toRemove.push( t );
			return false;

		} );
		for ( let i = 0, l = toRemove.length; i < l; i ++ ) {

			lruCache.remove( toRemove[ i ] );

		}

		this.stats = {
			parsing: 0,
			downloading: 0,
			failed: 0,
			inFrustum: 0,
			used: 0,
			active: 0,
			visible: 0,
		};
		this.frameCount = 0;

	}

	// Overrideable
	fetchData( url, options ) {

		return fetch( url, options );

	}

	parseTile( buffer, tile, extension ) {

		return null;

	}

	disposeTile( tile ) {

		if ( tile.__visible ) {

			this.setTileVisible( tile, false );
			tile.__visible = false;

		}

		if ( tile.__active ) {

			this.setTileActive( tile, false );
			tile.__active = false;

		}

	}

	preprocessNode( tile, tileSetDir, parentTile = null ) {

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

		if ( tile.content?.uri ) {

			// "content" should only indicate loadable meshes, not external tile sets
			const extension = getUrlExtension( tile.content.uri );

			tile.__hasContent = true;
			tile.__hasUnrenderableContent = Boolean( extension && /json$/.test( extension ) );
			tile.__hasRenderableContent = ! tile.__hasUnrenderableContent;

		} else {

			tile.__hasContent = false;
			tile.__hasUnrenderableContent = false;
			tile.__hasRenderableContent = false;

		}

		// Expected to be set during calculateError()
		tile.__distanceFromCamera = Infinity;
		tile.__error = Infinity;

		tile.__inFrustum = false;
		tile.__isLeaf = false;

		tile.__usedLastFrame = false;
		tile.__used = false;

		tile.__wasSetVisible = false;
		tile.__visible = false;
		tile.__childrenWereVisible = false;
		tile.__allChildrenLoaded = false;

		tile.__wasSetActive = false;
		tile.__active = false;

		tile.__loadingState = UNLOADED;
		tile.__loadIndex = 0;

		tile.__loadAbort = null;

		if ( parentTile === null ) {

			tile.__depth = 0;
			tile.__depthFromRenderedParent = 0;
			tile.refine = tile.refine || 'REPLACE';

		} else {

			// increment the "depth from parent" when we encounter a new tile with content
			tile.__depth = parentTile.__depth + 1;
			tile.__depthFromRenderedParent = parentTile.__depthFromRenderedParent + ( tile.__hasRenderableContent ? 1 : 0 );

			tile.refine = tile.refine || parentTile.refine;

		}

		tile.__basePath = tileSetDir;

		tile.__lastFrameVisited = - 1;

		this.invokeAllPlugins( plugin => {

			plugin !== this && plugin.preprocessNode && plugin.preprocessNode( tile, tileSetDir, parentTile );

		} );

	}

	setTileActive( tile, state ) {

	}

	setTileVisible( tile, state ) {

	}

	calculateError( tile ) {

		return 0;

	}

	tileInView( tile ) {

		return true;

	}

	ensureChildrenArePreprocessed( tile ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const child = children[ i ];
			if ( '__depth' in child ) {

				break;

			}

			this.preprocessNode( child, tile.__basePath, tile );

		}

	}

	// Private Functions
	preprocessTileSet( json, url, parent = null ) {

		const version = json.asset.version;
		const [ major, minor ] = version.split( '.' ).map( v => parseInt( v ) );
		console.assert(
			major <= 1,
			'TilesRenderer: asset.version is expected to be a 1.x or a compatible version.',
		);

		if ( major === 1 && minor > 0 ) {

			console.warn( 'TilesRenderer: tiles versions at 1.1 or higher have limited support. Some new extensions and features may not be supported.' );

		}

		// remove trailing slash and last path-segment from the URL
		let basePath = url.replace( /\/[^/]*\/?$/, '' );
		basePath = new URL( basePath, window.location.href ).toString();
		this.preprocessNode( json.root, basePath, parent );

	}

	loadRootTileSet() {

		// transform the url
		let processedUrl = this.rootURL;
		this.invokeAllPlugins( plugin => processedUrl = plugin.preprocessURL ? plugin.preprocessURL( processedUrl, null ) : processedUrl );

		// load the tile set root
		const pr = this
			.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( processedUrl, this.fetchOptions ) )
			.then( res => {

				if ( res.ok ) {

					return res.json();

				} else {

					throw new Error( `TilesRenderer: Failed to load tileset "${ processedUrl }" with status ${ res.status } : ${ res.statusText }` );

				}

			} )
			.then( json => {

				this.preprocessTileSet( json, processedUrl );
				this.rootTileSet = json;

			} );

		pr.catch( err => {

			console.error( err );
			this.rootTileSet = null;

		} );

		return pr;

	}

	requestTileContents( tile ) {

		// If the tile is already being loaded then don't
		// start it again.
		if ( tile.__loadingState !== UNLOADED ) {

			return;

		}

		let isExternalTileSet = false;
		let uri = new URL( tile.content.uri, tile.__basePath + '/' ).toString();
		this.invokeAllPlugins( plugin => uri = plugin.preprocessURL ? plugin.preprocessURL( uri, tile ) : uri );

		const stats = this.stats;
		const lruCache = this.lruCache;
		const downloadQueue = this.downloadQueue;
		const parseQueue = this.parseQueue;
		const extension = getUrlExtension( uri );
		const addedSuccessfully = lruCache.add( tile, t => {

			// Stop the load if it's started
			if ( t.__loadingState === LOADING ) {

				t.__loadAbort.abort();
				t.__loadAbort = null;

			} else if ( isExternalTileSet ) {

				t.children.length = 0;

			} else {

				this.invokeAllPlugins( plugin => {

					plugin.disposeTile && plugin.disposeTile( t );

				} );

			}

			// Decrement stats
			if ( t.__loadingState === LOADING ) {

				stats.downloading --;

			} else if ( t.__loadingState === PARSING ) {

				stats.parsing --;

			}

			t.__loadingState = UNLOADED;
			t.__loadIndex ++;

			parseQueue.remove( t );
			downloadQueue.remove( t );

		} );

		// if we couldn't add the tile to the lru cache because it's full then skip
		if ( ! addedSuccessfully ) {

			return;

		}

		// Track a new load index so we avoid the condition where this load is stopped and
		// another begins soon after so we don't parse twice.
		tile.__loadIndex ++;
		const loadIndex = tile.__loadIndex;
		const controller = new AbortController();
		const signal = controller.signal;

		stats.downloading ++;
		tile.__loadAbort = controller;
		tile.__loadingState = LOADING;

		const errorCallback = e => {

			// if it has been unloaded then the tile has been disposed
			if ( tile.__loadIndex !== loadIndex ) {

				return;

			}

			if ( e.name !== 'AbortError' ) {

				parseQueue.remove( tile );
				downloadQueue.remove( tile );

				if ( tile.__loadingState === PARSING ) {

					stats.parsing --;

				} else if ( tile.__loadingState === LOADING ) {

					stats.downloading --;

				}

				stats.failed ++;

				console.error( `TilesRenderer : Failed to load tile at url "${ tile.content.uri }".` );
				console.error( e );
				tile.__loadingState = FAILED;
				lruCache.setLoaded( tile, true );

			} else {

				lruCache.remove( tile );

			}

		};

		// queue the download and parse
		return downloadQueue.add( tile, downloadTile => {

			if ( downloadTile.__loadIndex !== loadIndex ) {

				return Promise.resolve();

			}

			return this.invokeOnePlugin( plugin => plugin.fetchData && plugin.fetchData( uri, { ...this.fetchOptions, signal } ) );

		} )
			.then( res => {

				if ( tile.__loadIndex !== loadIndex ) {

					return;

				}

				if ( res.ok ) {

					return extension === 'json' ? res.json() : res.arrayBuffer();

				} else {

					throw new Error( `Failed to load model with error code ${res.status}` );

				}

			} )
			.then( content => {

				// if it has been unloaded then the tile has been disposed
				if ( tile.__loadIndex !== loadIndex ) {

					return;

				}

				stats.downloading --;
				stats.parsing ++;
				tile.__loadAbort = null;
				tile.__loadingState = PARSING;

				return parseQueue.add( tile, parseTile => {

					// if it has been unloaded then the tile has been disposed
					if ( parseTile.__loadIndex !== loadIndex ) {

						return Promise.resolve();

					}

					if ( extension === 'json' && content.root ) {

						this.preprocessTileSet( content, uri, tile );
						tile.children.push( content.root );
						isExternalTileSet = true;
						return Promise.resolve();

					} else {

						return this.invokeOnePlugin( plugin => plugin.parseTile && plugin.parseTile( content, parseTile, extension, uri ) );

					}

				} );

			} )
			.then( () => {

				// if it has been unloaded then the tile has been disposed
				if ( tile.__loadIndex !== loadIndex ) {

					return;

				}

				stats.parsing --;
				tile.__loadingState = LOADED;
				lruCache.setLoaded( tile, true );

				// If the memory of the item hasn't been registered yet then that means the memory usage hasn't
				// been accounted for by the cache yet so we need to check if it fits or if we should remove it.
				if ( lruCache.getMemoryUsage( tile ) === null ) {

					if ( lruCache.isFull() && lruCache.computeMemoryUsageCallback( tile ) > 0 ) {

						// And if the cache is full due to newly loaded memory then lets discard this tile - it will
						// be loaded again later from the disk cache if needed.
						lruCache.remove( tile );

					} else {

						// Otherwise update the item to the latest known value
						lruCache.updateMemoryUsage( tile );

					}

				}

			} )
			.catch( errorCallback );

	}

	getAttributions( target = [] ) {

		this.invokeAllPlugins( plugin => plugin !== this && plugin.getAttributions && plugin.getAttributions( target ) );
		return target;

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

}
