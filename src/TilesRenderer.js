import path from 'path';
import { LRUCache } from './LRUCache.js';
import { PriorityQueue } from './PriorityQueue.js';

// TODO: find out why tiles are left dangling in the hierarchy
// TODO: Address the issue of too many promises, garbage collection
// TODO: remove more redundant computation
// TODO: See if using classes improves performance
// TODO: See if declaring function inline improves performance
// TODO: Make sure active state works as expected

const UNLOADED = 0;
const LOADING = 1;
const PARSING = 2;
const LOADED = 3;
const FAILED = 4;

function traverseSet( tile, beforeCb = null, afterCb = null, parent = null, depth = 0 ) {

	if ( beforeCb && beforeCb( tile, parent, depth ) ) {

		if ( afterCb ) {

			afterCb( tile, parent, depth );

		}

		return;

	}

	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		traverseSet( children[ i ], beforeCb, afterCb, tile, depth + 1 );

	}

	if ( afterCb ) {

		afterCb( tile, parent, depth );

	}

}

function isUsedThisFrame( tile, frameCount ) {

	return tile.__lastFrameVisited === frameCount && tile.__used;

}

function resetFrameState( tile, frameCount ) {

	if ( tile.__lastFrameVisited !== frameCount ) {

		tile.__lastFrameVisited = frameCount;
		tile.__used = false;
		tile.__inFrustum = false;
		tile.__isLeaf = false;
		tile.__visible = false;
		tile.__active = false;
		tile.__error = 0;

	}

}

function recursivelyMarkUsed( tile, frameCount, lruCache ) {

	resetFrameState( tile, frameCount );

	tile.__used = true;
	lruCache.markUsed( tile );
	if ( tile.__contentEmpty ) {

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( children[ i ], frameCount, lruCache );

		}

	}

}

// TODO: include frustum mask here?
function determineFrustumSet( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	const errorTarget = renderer.errorTarget;
	const maxDepth = renderer.maxDepth;
	const loadSiblings = renderer.loadSiblings;
	const lruCache = renderer.lruCache;
	resetFrameState( tile, frameCount );

	const inFrustum = renderer.tileInView( tile );
	if ( inFrustum === false ) {

		return false;

	}

	tile.__used = true;
	lruCache.markUsed( tile );

	tile.__inFrustum = true;
	stats.inFrustum ++;

	if ( ! tile.__contentEmpty ) {

		const error = renderer.calculateError( tile );
		tile.__error = error;
		if ( error <= errorTarget ) {

			return true;

		}

	}

	if ( renderer.maxDepth > 0 && tile.__depth + 1 >= maxDepth ) {

		return true;

	}

	let anyChildrenUsed = false;
	const children = tile.children;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		const r = determineFrustumSet( c, renderer );
		anyChildrenUsed = anyChildrenUsed || r;

	}

	if ( anyChildrenUsed && loadSiblings ) {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			recursivelyMarkUsed( tile, frameCount, lruCache );

		}

	}

	return true;

}

function markUsedSetLeaves( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	stats.used ++;

	const children = tile.children;
	let anyChildrenUsed = false;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		anyChildrenUsed = anyChildrenUsed || isUsedThisFrame( c, frameCount );

	}

	if ( ! anyChildrenUsed ) {

		tile.__isLeaf = true;

		// TODO: stats

	} else {

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			markUsedSetLeaves( c, renderer );

		}

	}

}

function skipTraversal( tile, renderer ) {

	const stats = renderer.stats;
	const frameCount = renderer.frameCount;
	if ( ! isUsedThisFrame( tile, frameCount ) ) {

		return;

	}

	const lruCache = renderer.lruCache;
	if ( tile.__isLeaf ) {

		if ( tile.__loadingState === LOADED ) {

			if ( tile.__inFrustum ) {

				tile.__visible = true;
				stats.visible ++;

			}
			tile.__active = true;
			stats.active ++;

		} else if ( ! lruCache.isFull() ) {

			renderer.requestTileContents( tile );

		}
		return;

	}

	const errorRequirement = renderer.errorTarget * renderer.errorThreshold;
	const meetsSSE = tile.__error < errorRequirement;
	const hasContent = tile.__loadingState === LOADED && ! tile.__contentEmpty;
	const children = tile.children;
	let allChildrenHaveContent = true;
	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, frameCount ) ) {

			const childContent = c.__loadingState === LOADED || tile.__contentEmpty;
			allChildrenHaveContent = allChildrenHaveContent && childContent;

		}

	}

	if ( meetsSSE && ! hasContent && ! lruCache.isFull() ) {

		renderer.requestTileContents( tile );

	}

	if ( meetsSSE && hasContent && ! allChildrenHaveContent ) {

		if ( tile.__inFrustum ) {

			tile.__visible = true;
			stats.visible ++;

		}
		tile.__active = true;
		stats.active ++;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			if ( isUsedThisFrame( c, frameCount ) && ! lruCache.isFull() ) {

				renderer.requestTileContents( c );

			}

		}
		return;

	}

	for ( let i = 0, l = children.length; i < l; i ++ ) {

		const c = children[ i ];
		if ( isUsedThisFrame( c, frameCount ) ) {

			skipTraversal( c, renderer );

		}

	}

}

function toggleTiles( tile, renderer ) {

	const frameCount = renderer.frameCount;
	const isUsed = isUsedThisFrame( tile, frameCount );
	if ( isUsed || tile.__usedLastFrame ) {

		if ( ! isUsed ) {

			if ( ! tile.__contentEmpty && tile.__loadingState === LOADED ) {

				renderer.setTileVisible( tile, false );
				renderer.setTileActive( tile, false );

			}
			tile.__usedLastFrame = false;

		} else {

			if ( ! tile.__contentEmpty && tile.__loadingState === LOADED ) {

				// enable visibility if active due to shadows
				renderer.setTileActive( tile, tile.__active );
				renderer.setTileVisible( tile, tile.__active || tile.__visible );

			}
			tile.__usedLastFrame = true;

		}

		const children = tile.children;
		for ( let i = 0, l = children.length; i < l; i ++ ) {

			const c = children[ i ];
			toggleTiles( c, renderer );

		}

	}

}

class TilesRenderer {

	get root() {

		return this.tileSets[ this.rootSet ].root;

	}

	constructor( url, cache = new LRUCache(), downloadQueue = new PriorityQueue( 6 ), parseQueue = new PriorityQueue( 2 ) ) {

		// state
		this.tileSets = {};
		this.rootSet = url;
		this.lruCache = cache;

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
		this.loadSiblings = true;

		this.loadTileSet( url );

	}

	traverse( cb ) {

		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootSet ];
		if ( ! rootTileSet.root ) return;

		traverseSet( rootTileSet.root, cb );

	}

	// Public API
	update() {

		const stats = this.stats;
		const lruCache = this.lruCache;
		const tileSets = this.tileSets;
		const rootTileSet = tileSets[ this.rootSet ];
		if ( ! rootTileSet.root ) return;

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
                fetch( url, { credentials: 'same-origin' } )
                	.then( res => {

                		return res.json();

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

			return fetch( tile.content.uri, { credentials: 'same-origin', signal } );

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

export { TilesRenderer };
