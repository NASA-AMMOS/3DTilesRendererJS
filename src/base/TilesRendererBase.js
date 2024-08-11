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

	} else if ( a.__lastFrameVisited !== b.__lastFrameVisited ) {

		// dispose of least recent tiles first
		return a.__lastFrameVisited > b.__lastFrameVisited ? - 1 : 1;

	} else if ( a.__hasUnrenderableContent !== b.__hasUnrenderableContent ) {

		// dispose of external tile sets last
		return a.__hasUnrenderableContent ? - 1 : 1;

	}

	return 0;

};

export class TilesRendererBase {

	get rootTileSet() {

		const tileSet = this.tileSets[ this.rootURL ];
		if ( ! tileSet || tileSet instanceof Promise ) {

			return null;

		} else {

			return tileSet;

		}

	}

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

	constructor( url = null ) {

		// state
		this.tileSets = {};
		this.rootURL = url;
		this.fetchOptions = {};
		this.plugins = [];

		this.preprocessURL = null;

		const lruCache = new LRUCache();
		lruCache.unloadPriorityCallback = lruPriorityCallback;

		const downloadQueue = new PriorityQueue();
		downloadQueue.maxJobs = 4;
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

	registerPlugin( plugin ) {

		if ( plugin[ PLUGIN_REGISTERED ] === true ) {

			throw new Error( 'TilesRendererBase: A plugin can only be registered to a single tile set' );

		}

		this.plugins.push( plugin );
		plugin[ PLUGIN_REGISTERED ] = true;
		plugin.init( this );

	}

	getPluginByName( name ) {

		return this.plugins.find( p => p.name === name );

	}

	traverse( beforecb, aftercb ) {

		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootURL ];
		if ( ! rootTileSet || ! rootTileSet.root ) return;

		traverseSet( rootTileSet.root, ( tile, ...args ) => {

			this.ensureChildrenArePreprocessed( tile );
			return beforecb ? beforecb( tile, ...args ) : false;

		}, aftercb );

	}

	// Public API
	update() {

		const stats = this.stats;
		const lruCache = this.lruCache;
		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootURL ];
		if ( ! ( this.rootURL in tileSets ) ) {

			this.invokeOnePlugin( plugin => plugin.loadRootTileSet && plugin.loadRootTileSet( this.rootURL ) );
			return;

		} else if ( ! rootTileSet || ! rootTileSet.root ) {

			return;

		}

		const root = rootTileSet.root;

		stats.inFrustum = 0;
		stats.used = 0;
		stats.active = 0;
		stats.visible = 0;
		this.frameCount ++;

		markUsedTiles( root, this );
		markUsedSetLeaves( root, this );
		markVisibleTiles( root, this );
		toggleTiles( root, this );

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
	parseTile( buffer, tile, extension ) {

		return null;

	}

	disposeTile( tile ) {

	}

	preprocessNode( tile, tileSetDir, parentTile = null ) {

		// Store the original content uri
		const uri = tile.content?.uri;

		if ( tile.content ) {

			// Fix old file formats
			if ( ! ( 'uri' in tile.content ) && 'url' in tile.content ) {

				tile.content.uri = tile.content.url;
				delete tile.content.url;

			}

			if ( tile.content.uri ) {

				// tile content uri has to be interpreted relative to the tileset.json
				tile.content.uri = new URL( tile.content.uri, tileSetDir + '/' ).toString();

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

		if ( uri ) {

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

			plugin !== this && plugin.preprocessNode && plugin.preprocessNode( tile, uri, parentTile );

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
	fetchTileSet( url, fetchOptions, parent = null ) {

		return fetch( url, fetchOptions )
			.then( res => {

				if ( res.ok ) {

					return res.json();

				} else {

					throw new Error( `TilesRenderer: Failed to load tileset "${ url }" with status ${ res.status } : ${ res.statusText }` );

				}

			} )
			.then( json => {

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

				return json;

			} );

	}

	loadRootTileSet( url ) {

		const tileSets = this.tileSets;
		if ( ! ( url in tileSets ) ) {

			let processedUrl = url;
			this.invokeAllPlugins( plugin => processedUrl = plugin.preprocessURL ? plugin.preprocessURL( processedUrl ) : processedUrl );

			const pr = this
				.fetchTileSet( processedUrl, this.fetchOptions )
				.then( json => {

					tileSets[ url ] = json;

				} );

			pr.catch( err => {

				console.error( err );
				tileSets[ url ] = err;

			} );

			tileSets[ url ] = pr;

			return pr;

		} else if ( tileSets[ url ] instanceof Error ) {

			return Promise.reject( tileSets[ url ] );

		} else {

			return Promise.resolve( tileSets[ url ] );

		}

	}

	requestTileContents( tile ) {

		// If the tile is already being loaded then don't
		// start it again.
		if ( tile.__loadingState !== UNLOADED ) {

			return;

		}

		const stats = this.stats;
		const lruCache = this.lruCache;
		const downloadQueue = this.downloadQueue;
		const parseQueue = this.parseQueue;
		const uriExtension = getUrlExtension( tile.content.uri );
		const isExternalTileSet = Boolean( uriExtension && /json$/.test( uriExtension ) );
		const addedSuccessfully = lruCache.add( tile, t => {

			// Stop the load if it's started
			if ( t.__loadingState === LOADING ) {

				t.__loadAbort.abort();
				t.__loadAbort = null;

			} else if ( isExternalTileSet ) {

				t.children.length = 0;

			} else {

				this.disposeTile( t );

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

			} else {

				lruCache.remove( tile );

			}

		};

		if ( isExternalTileSet ) {

			downloadQueue.add( tile, tileCb => {

				// if it has been unloaded then the tile has been disposed
				if ( tileCb.__loadIndex !== loadIndex ) {

					return Promise.resolve();

				}

				let processedUrl = tileCb.content.uri;
				this.invokeAllPlugins( plugin => processedUrl = plugin.preprocessURL ? plugin.preprocessURL( processedUrl ) : processedUrl );

				return this.fetchTileSet( processedUrl, Object.assign( { signal }, this.fetchOptions ), tileCb );

			} )
				.then( json => {

					// if it has been unloaded then the tile has been disposed
					if ( tile.__loadIndex !== loadIndex ) {

						return;

					}

					stats.downloading --;
					tile.__loadAbort = null;
					tile.__loadingState = LOADED;

					tile.children.push( json.root );

				} )
				.catch( errorCallback );

		} else {

			downloadQueue.add( tile, downloadTile => {

				if ( downloadTile.__loadIndex !== loadIndex ) {

					return Promise.resolve();

				}

				let processedUrl = downloadTile.content.uri;
				this.invokeAllPlugins( plugin => processedUrl = plugin.preprocessURL ? plugin.preprocessURL( processedUrl ) : processedUrl );

				return fetch( processedUrl, Object.assign( { signal }, this.fetchOptions ) );

			} )
				.then( res => {

					if ( tile.__loadIndex !== loadIndex ) {

						return;

					}

					if ( res.ok ) {

						return res.arrayBuffer();

					} else {

						throw new Error( `Failed to load model with error code ${res.status}` );

					}

				} )
				.then( buffer => {

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

						const uri = parseTile.content.uri;
						const extension = getUrlExtension( uri );

						return this.invokeOnePlugin( plugin => plugin.parseTile && plugin.parseTile( buffer, parseTile, extension ) );

					} );

				} )
				.then( () => {

					// if it has been unloaded then the tile has been disposed
					if ( tile.__loadIndex !== loadIndex ) {

						return;

					}

					stats.parsing --;
					tile.__loadingState = LOADED;

					if ( tile.__wasSetVisible ) {

						this.setTileVisible( tile, true );

					}

					if ( tile.__wasSetActive ) {

						this.setTileActive( tile, true );

					}

				} )
				.catch( errorCallback );

		}

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
