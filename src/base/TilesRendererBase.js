import path from 'path';
import { LRUCache } from '../utilities/LRUCache.js';
import { PriorityQueue } from '../utilities/PriorityQueue.js';
import { determineFrustumSet, toggleTiles, skipTraversal, markUsedSetLeaves, traverseSet } from './traverseFunctions.js';
import { UNLOADED, LOADING, PARSING, LOADED, FAILED } from './constants.js';

// TODO: find out why tiles are left dangling in the hierarchy
// TODO: Address the issue of too many promises, garbage collection
// TODO: remove more redundant computation
// TODO: See if using classes improves performance
// TODO: See if declaring function inline improves performance
// TODO: Make sure active state works as expected

export class TilesRendererBase {

	get root() {

		const tileSet = this.tileSets[ this.rootSet ];
		if ( ! tileSet || tileSet instanceof Promise ) {

			return null;

		} else {

			return tileSet.root;

		}

	}

	constructor( url, cache = new LRUCache(), downloadQueue = new PriorityQueue( 6 ), parseQueue = new PriorityQueue( 1 ) ) {

		// state
		this.tileSets = {};
		this.rootSet = url;
		this.lruCache = cache;
		this.fetchOptions = { credentials: 'same-origin' };

		this.downloadQueue = downloadQueue;
		this.parseQueue = parseQueue;
		this.stats = {
			parsing: 0,
			downloading: 0,
			inFrustum: 0,
			used: 0,
			active: 0,
			visible: 0,
		};
		this.frameCount = 0;

		// options
		this.errorTarget = 6.0;
		this.errorThreshold = 6.0;
		this.loadSiblings = true;
		this.maxDepth = Infinity;

		this.loadTileSet( url );

	}

	traverse( cb ) {

		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootSet ];
		if ( ! rootTileSet || ! rootTileSet.root ) return;

		traverseSet( rootTileSet.root, cb );

	}

	// Public API
	update() {

		const stats = this.stats;
		const lruCache = this.lruCache;
		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootSet ];
		if ( ! rootTileSet || ! rootTileSet.root ) return;

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

		// TODO: We may want to add this function in the requestTileContents function
		lruCache.scheduleUnload( null );

	}

	// Overrideable
	parseTile( buffer, tile ) {

		return null;

	}

	disposeTile( tile ) {

	}

	preprocessNode( tile, parentTile, tileSetDir ) {

		if ( tile.content ) {

			if ( ! ( 'uri' in tile.content ) && 'url' in tile.content ) {

				tile.content.uri = tile.content.url;
				delete tile.content.url;

			}

			if ( tile.content.uri ) {

				tile.content.uri = path.join( tileSetDir, tile.content.uri );

			}

			// TODO: fix for some cases where tilesets provide the bounding volume
			// but volumes are not present. See
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
		tile.__contentEmpty = ! tile.content || ! tile.content.uri;

		tile.__error = 0.0;
		tile.__inFrustum = false;
		tile.__isLeaf = false;

		tile.__wasUsed = false;
		tile.__used = false;

		tile.__wasVisible = false;
		tile.__visible = false;

		tile.__wasActive = false;
		tile.__active = false;

		tile.__childrenActive = false;
		tile.__loadingState = UNLOADED;
		tile.__loadIndex = 0;

		tile.__loadAbort = null;

		if ( parentTile === null ) {

			tile.__depth = 0;

		} else {

			tile.__depth = parentTile.__depth + 1;

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

	// Private Functions
	loadTileSet( url ) {

		const tileSets = this.tileSets;
		if ( ! ( url in tileSets ) ) {

			const pr =
                fetch( url, this.fetchOptions )
                	.then( res => {

                		if ( res.ok ) {

                			return res.json();

                		} else {

                			throw new Error( `Status ${ res.status } (${ res.statusText })` );

                		}

                	} )
                	.then( json => {

                		// TODO: Add version query?
                		const version = json.asset.version;
                		console.assert( version === '1.0' || version === '0.0' );

                		const basePath = path.dirname( url );

                		traverseSet( json.root, ( node, parent ) => this.preprocessNode( node, parent, basePath ) );

                		tileSets[ url ] = json;

                		// TODO: schedule an update to avoid doing this too many times
                		this.update();

                	} );

			pr.catch( e => {

				console.error( `TilesLoader: Failed to load tile set json "${ url }"` );
				console.error( e );
				delete tileSets[ url ];

			} );

			tileSets[ url ] = pr;

		}

		return Promise.resolve( tileSets[ url ] );

	}

	requestTileContents( tile ) {

		// If the tile is already being loaded then don't
		// start it again.
		if ( tile.__loadingState !== UNLOADED ) {

			return;

		}

		// TODO: reuse the functions created here?
		const lruCache = this.lruCache;
		const downloadQueue = this.downloadQueue;
		const parseQueue = this.parseQueue;
		lruCache.add( tile, t => {

			if ( t.__loadingState === LOADING ) {

				t.__loadAbort.abort();
				t.__loadAbort = null;

			} else {

				this.disposeTile( t );

			}

			if ( t.__loadingState === LOADING ) {

				stats.downloading --;

			} else if ( t.__loadingState === PARSING ) {

				stats.parsing --;

			}

			t.__loadingState = UNLOADED;
			t.__loadIndex ++;

			// TODO: Removing from the queues here is slow
			// parseQueue.remove( t );
			// downloadQueue.remove( t );

		} );

		tile.__loadIndex ++;
		const loadIndex = tile.__loadIndex;
		const priority = 1 / ( tile.__depth + 1 );
		const stats = this.stats;

		const controller = new AbortController();
		const signal = controller.signal;

		stats.downloading ++;
		tile.__loadAbort = controller;
		tile.__loadingState = LOADING;
		downloadQueue.add( tile, priority, tile => {

			if ( tile.__loadIndex !== loadIndex ) {

				return Promise.resolve();

			}

			return fetch( tile.content.uri, Object.assign( { signal }, this.fetchOptions ) );

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

				if ( tile.__loadIndex !== loadIndex ) {

					return;

				}

				stats.downloading --;
				stats.parsing ++;
				tile.__loadAbort = null;
				tile.__loadingState = PARSING;

				return parseQueue.add( buffer, priority, buffer => {

					if ( tile.__loadIndex !== loadIndex ) {

						return Promise.resolve();

					}

					return this.parseTile( buffer, tile );

				} );

			} )
			.then( () => {

				if ( tile.__loadIndex !== loadIndex ) {

					return;

				}

				stats.parsing --;
				tile.__loadingState = LOADED;
				this.setTileActive( tile, tile.__active );
				this.setTileVisible( tile, tile.__visible );

			} )
			.catch( e => {

				// if it has been unloaded then the tile has been disposed
				if ( tile.__loadIndex !== loadIndex ) {

					return;

				}

				if ( e.name !== 'AbortError' ) {

					console.error( 'TilesRenderer : Failed to load tile.' );
					console.error( e );
					tile.__loadingState = FAILED;

				} else {

					lruCache.remove( tile );

				}

			} );

	}

}
