import { getUrlExtension } from '../utilities/urlExtension.js';
import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';
import { determineFrustumSet, toggleTiles, skipTraversal, markUsedSetLeaves, traverseSet } from './traverseFunctions.js';
import { UNLOADED, LOADING, PARSING, LOADED, FAILED } from './constants.js';

/**
 * Function for provided to sort all tiles for prioritizing loading/unloading.
 *
 * @param {Tile} a
 * @param {Tile} b
 * @returns number
 */
const priorityCallback = ( a, b ) => {

	if ( a.__depth !== b.__depth ) {

		// load shallower tiles first
		return a.__depth > b.__depth ? - 1 : 1;

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

/**
 * Function for sorting the evicted LRU items. We should evict the shallowest depth first.
 * @param {Tile} tile
 * @returns number
 */
const lruPriorityCallback = ( tile ) => 1 / ( tile.__depthFromRenderedParent + 1 );

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

	constructor( url ) {

		// state
		this.tileSets = {};
		this.rootURL = url;
		this.fetchOptions = {};

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
		this.loadSiblings = true;
		this.displayActiveTiles = false;
		this.maxDepth = Infinity;
		this.stopAtEmptyTiles = true;

	}

	traverse( beforecb, aftercb ) {

		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootURL ];
		if ( ! rootTileSet || ! rootTileSet.root ) return;

		traverseSet( rootTileSet.root, beforecb, aftercb );

	}

	// Public API
	update() {

		const stats = this.stats;
		const lruCache = this.lruCache;
		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootURL ];
		if ( ! ( this.rootURL in tileSets ) ) {

			this.loadRootTileSet( this.rootURL );
			return;

		} else if ( ! rootTileSet || ! rootTileSet.root ) {

			return;

		}

		const root = rootTileSet.root;

		stats.inFrustum = 0,
		stats.used = 0,
		stats.active = 0,
		stats.visible = 0,
		this.frameCount ++;

		determineFrustumSet( root, this );
		markUsedSetLeaves( root, this );
		skipTraversal( root, this );
		toggleTiles( root, this );

		lruCache.scheduleUnload();

	}

	// Overrideable
	parseTile( buffer, tile, extension ) {

		return null;

	}

	disposeTile( tile ) {

	}

	preprocessNode( tile, parentTile, tileSetDir ) {

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

		const uri = tile.content && tile.content.uri;
		if ( uri ) {

			// "content" should only indicate loadable meshes, not external tile sets
			const extension = getUrlExtension( tile.content.uri );
			const isExternalTileSet = Boolean( extension && extension.toLowerCase() === 'json' );
			tile.__externalTileSet = isExternalTileSet;
			tile.__contentEmpty = isExternalTileSet;

		} else {

			tile.__externalTileSet = false;
			tile.__contentEmpty = true;

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

		tile.__depthFromRenderedParent = - 1;
		if ( parentTile === null ) {

			tile.__depth = 0;
			tile.refine = tile.refine || 'REPLACE';

		} else {

			tile.__depth = parentTile.__depth + 1;
			tile.refine = tile.refine || parentTile.refine;

		}

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
				console.assert(
					version === '1.0' || version === '0.0',
					'asset.version is expected to be a string of "1.0" or "0.0"'
				);

				// remove trailing slash and last path-segment from the URL
				let basePath = url.replace( /\/[^\/]*\/?$/, '' );
				basePath = new URL( basePath, window.location.href ).toString();

				traverseSet(
					json.root,
					( node, parent ) => this.preprocessNode( node, parent, basePath ),
					null,
					parent,
					parent ? parent.__depth : 0,
				);

				return json;

			} );

	}

	loadRootTileSet( url ) {

		const tileSets = this.tileSets;
		if ( ! ( url in tileSets ) ) {

			const pr = this
				.fetchTileSet( this.preprocessURL ? this.preprocessURL( url ) : url, this.fetchOptions )
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
		const isExternalTileSet = tile.__externalTileSet;
		lruCache.add( tile, t => {

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

				const uri = this.preprocessURL ? this.preprocessURL( tileCb.content.uri ) : tileCb.content.uri;
				return this.fetchTileSet( uri, Object.assign( { signal }, this.fetchOptions ), tileCb );

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

				const uri = this.preprocessURL ? this.preprocessURL( downloadTile.content.uri ) : downloadTile.content.uri;
				return fetch( uri, Object.assign( { signal }, this.fetchOptions ) );

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

						return this.parseTile( buffer, parseTile, extension );

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

	dispose() {

		const lruCache = this.lruCache;
		this.traverse( tile => {

			lruCache.remove( tile );

		} );

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

}
