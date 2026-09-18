import { EventDispatcher } from 'three';

const UNLOADED = 0;
const LOADING = 1;
const LOADED = 2;
const FAILED = 3;
const TIMER_DURATION = 150;

function getChildKey( x, y ) {

	return ( x * 1 ) | ( y * 2 );

}

function getKey( x, y, level ) {

	return `${ x }_${ y }_${ level }`;

}

class MVTTile {

	constructor() {

		this.parent = null;
		this.x = 0;
		this.y = 0;
		this.level = 0;

		this.children = new Array( 4 ).fill( null );
		this.childCount = 0;

		this.loadingState = UNLOADED;
		this.visible = false;
		this.target = 0;
		this.showTimer = 0;
		this.hideTimer = 0;

		// set when a sibling in this tile's quad is targeted and the hierarchy is displaying
		// complete sibling sets, forcing this tile to load and display along with it
		this.siblingForced = false;

		// whether any tile below this one is targeted, so every level between forms a full
		// sibling set and this tile is only replaced once the whole set below is ready
		this.descendantTargeted = false;

		// display state resolved each update: whether this tile is wanted after its show delay,
		// whether a wanted tile lies below it, whether anything below it is displayed, and whether
		// it or the replacement set below it is ready to display
		this.wanted = false;
		this.descendantWanted = false;
		this.subtreeVisible = false;
		this.cutReady = false;

		// ref count of callers that want this tile's content loaded ahead of it being displayed.
		// Prefetched tiles load and stay resident but never display on their own.
		this.prefetch = 0;

		this._key = null;
		this._index = null;

	}

	getKey() {

		if ( this._key === null ) {

			this._key = `${ this.x }_${ this.y }_${ this.level }`;

		}

		return this._key;

	}

	getIndex() {

		if ( this._index === null ) {

			this._index = getChildKey( this.x % 2, this.y % 2 );

		}

		return this._index;

	}

	addChild( child ) {

		const index = child.getIndex();
		if (
			this.children[ index ] ||
			( child.x >> 1 ) !== this.x ||
			( child.y >> 1 ) !== this.y ||
			( child.level - 1 ) !== this.level
		) {

			throw new Error();

		}

		child.parent = this;
		this.children[ index ] = child;
		this.childCount ++;

	}

	remove() {

		if ( this.childCount > 0 ) {

			throw new Error();

		}

		this.parent.childCount --;
		this.parent.children[ this.getIndex() ] = null;
		this.parent = null;

	}

}

const _toPrune = new Set();
export class MVTHierarchy extends EventDispatcher {

	constructor() {

		super();

		this.root = new MVTTile();
		this.cache = {
			[ this.root.getKey() ]: this.root,
		};
		this.contentCache = null;
		this._lastTime = - 1;

		// When true a targeted tile pulls in its full sibling set, and the set only displays once
		// every sibling has loaded - replacing the parent tile entirely so it never displays for
		// coverage.
		this.loadSiblings = true;

	}

	update() {

		const now = performance.now();
		const lastTime = this._lastTime === - 1 ? now : this._lastTime;
		const dt = now - lastTime;
		this._lastTime = now;

		const { root } = this;
		const scope = this;

		// first pass: flag the tiles with targeted descendants
		updateDescendantTargeted( root );

		// second pass: advance timers, maintain sibling sets, and kick off loads so the visibility
		// pass sees this frame's final loading state - including synchronous cache-hit loads
		updateState( root );

		// third pass: readiness of each tile, or of the replacement set below it
		updateReady( root );

		// fourth pass: resolve visibility, only swapping a tile for the set below once it is all ready
		updateVisibility( root, false, false );

		_toPrune.forEach( tile => this._deleteTile( tile ) );
		_toPrune.clear();

		function updateDescendantTargeted( tile ) {

			let result = false;
			const { children } = tile;
			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					result = updateDescendantTargeted( child ) || result;

				}

			}

			tile.descendantTargeted = result;
			return result || tile.target > 0;

		}

		function updateState( tile ) {

			// whether this tile's content is wanted - targeted directly or pulled in as part of a
			// displayed sibling set
			const targeted = tile.target > 0 || tile.siblingForced;

			// increment / decrement timers for determining whether to hide / show content
			if ( targeted ) {

				tile.showTimer += dt;
				tile.showTimer = Math.min( tile.showTimer, TIMER_DURATION );
				if ( tile.showTimer === TIMER_DURATION ) {

					tile.hideTimer = 0;

				}

			} else if ( tile.visible || tile.showTimer > 0 ) {

				tile.hideTimer += dt;
				tile.hideTimer = Math.min( tile.hideTimer, TIMER_DURATION );
				if ( tile.hideTimer === TIMER_DURATION ) {

					tile.showTimer = 0;
					tile.hideTimer = 0;

					// Release the content lock; reset synchronously so the tile is in a clean
					// state before any async callbacks can observe it. Prefetched tiles keep
					// their content so it is ready when the tile is displayed again, and displayed
					// tiles keep it until they are replaced.
					if ( tile.loadingState !== UNLOADED && tile.prefetch === 0 && ! tile.visible ) {

						scope.contentCache.release( tile.x, tile.y, tile.level );
						tile.loadingState = UNLOADED;

					}

				}

			}

			// Active after show delay; stays active through the hide delay so visible tiles don't flash
			const isTargetTile = targeted ? tile.showTimer === TIMER_DURATION : tile.showTimer > 0;

			// A tile held only by prefetch runs no timers, so once the last caller lets go there is
			// nothing to wind down and the content is released here instead
			if ( ! targeted && ! tile.visible && tile.prefetch === 0 && tile.showTimer === 0 && tile.loadingState !== UNLOADED ) {

				scope.contentCache.release( tile.x, tile.y, tile.level );
				tile.loadingState = UNLOADED;

			}

			// Kick off load once the show timer commits to this tile, or immediately when the tile
			// is prefetched so the content is ready before it is ever displayed
			if ( ( isTargetTile || tile.prefetch > 0 ) && tile.loadingState === UNLOADED ) {

				tile.loadingState = LOADING;

				const { x, y, level } = tile;
				const result = scope.contentCache.lock( x, y, level );
				if ( result instanceof Promise ) {

					result
						.then( res => {

							if ( tile.loadingState === LOADING ) {

								tile.loadingState = LOADED;

							}

						} )
						.catch( err => {

							if ( tile.loadingState === LOADING ) {

								tile.loadingState = err.name === 'AbortError' ? UNLOADED : FAILED;

							}

						} );

				} else {

					tile.loadingState = result !== null ? LOADED : FAILED;

				}

			}

			// when loadSiblings is true, a targeted tile below ensures all four children exist and
			// forces them to load so this tile is only replaced by a complete set
			const { children } = tile;
			if ( scope.loadSiblings ) {

				let anyChildTargeted = false;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					if ( child !== null && ( child.target > 0 || child.descendantTargeted ) ) {

						anyChildTargeted = true;

					}

				}

				if ( anyChildTargeted && tile.childCount < 4 ) {

					for ( let cy = 0; cy <= 1; cy ++ ) {

						for ( let cx = 0; cx <= 1; cx ++ ) {

							scope._ensureTile( 2 * tile.x + cx, 2 * tile.y + cy, tile.level + 1 );

						}

					}

				}

				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					if ( child !== null ) {

						child.siblingForced = anyChildTargeted;

					}

				}

			} else {

				// clear any stale forcing when the sibling traversal is disabled
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					if ( child !== null ) {

						child.siblingForced = false;

					}

				}

			}

			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					updateState( child );

				}

			}

		}

		// A tile with a wanted descendant is replaced by the set below it, so it is ready once all
		// four children are. Otherwise it is ready once its own load has finished, failed tiles
		// included so a set can display with missing content.
		function updateReady( tile ) {

			const targeted = tile.target > 0 || tile.siblingForced;

			// wanted after the show delay, and through the hide delay so content doesn't flash
			tile.wanted = targeted ? tile.showTimer === TIMER_DURATION : tile.showTimer > 0;

			const { children } = tile;
			let childrenReady = tile.childCount === 4;
			let descendantWanted = false;
			let subtreeVisible = false;
			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					childrenReady = updateReady( child ) && childrenReady;
					descendantWanted = descendantWanted || child.wanted || child.descendantWanted;
					subtreeVisible = subtreeVisible || child.visible || child.subtreeVisible;

				}

			}

			tile.descendantWanted = descendantWanted;
			tile.subtreeVisible = subtreeVisible;
			tile.cutReady = descendantWanted ? childrenReady : tile.loadingState === LOADED || tile.loadingState === FAILED;

			return tile.cutReady;

		}

		// "ancestorDisplayed" is set below a tile standing in for a set that is still loading, so
		// nothing below it displays until the whole set swaps in. "hold" is set below a wanted
		// tile that is still loading, so the tiles currently displayed there stay until it can
		// replace them.
		function updateVisibility( tile, ancestorDisplayed, hold ) {

			const targeted = tile.target > 0 || tile.siblingForced;
			const { children } = tile;
			let setVisible = false;
			let childAncestorDisplayed = ancestorDisplayed;
			let childHold = hold;

			if ( hold ) {

				setVisible = tile.visible;

			} else if ( ancestorDisplayed ) {

				setVisible = false;

			} else if ( tile.descendantWanted ) {

				if ( ! tile.cutReady ) {

					// cover for the loading set below unless part of it is already displayed
					setVisible = tile.loadingState === LOADED && ! tile.subtreeVisible;
					childAncestorDisplayed = setVisible;

				}

			} else if ( tile.wanted ) {

				if ( tile.loadingState === LOADED || tile.loadingState === FAILED ) {

					setVisible = tile.loadingState === LOADED;
					childAncestorDisplayed = true;

				} else {

					childHold = true;

				}

			}

			// showTimer > 0 keeps tiles with in-flight loads from being pruned mid-hysteresis
			let tileRequired = tile.visible || targeted || tile.showTimer > 0 || tile.prefetch > 0;
			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					tileRequired = updateVisibility( child, childAncestorDisplayed, childHold ) || tileRequired;

				}

			}

			if ( setVisible !== tile.visible ) {

				tile.visible = setVisible;

				scope.dispatchEvent( {
					type: 'toggle',
					visible: setVisible,
					x: tile.x,
					y: tile.y,
					level: tile.level,
				} );

			}

			if ( tile !== scope.root && ! tileRequired ) {

				_toPrune.add( tile );

			}

			return tileRequired;

		}

	}

	getVisibleTiles() {

		let arr = [];
		for ( const key in this.cache ) {

			const child = this.cache[ key ];

			if ( child.visible ) {

				arr.push( child );

			}

		}

		return arr;

	}

	setTargetState( x, y, l, target ) {

		if ( target ) {

			const tile = this._ensureTile( x, y, l );
			tile.target ++;

		} else {

			const tile = this.cache[ getKey( x, y, l ) ];
			if ( ! tile || tile.target <= 0 ) {

				throw new Error( 'MVTHierarchy: target ref count went negative — mismatched calls.' );

			}

			tile.target --;

		}

	}

	// Marks a tile as wanted ahead of being displayed, so its content is loaded and held resident
	// without it becoming visible on its own.
	setPrefetchState( x, y, l, state ) {

		if ( state ) {

			const tile = this._ensureTile( x, y, l );
			tile.prefetch ++;

		} else {

			const tile = this.cache[ getKey( x, y, l ) ];
			if ( ! tile || tile.prefetch <= 0 ) {

				throw new Error( 'MVTHierarchy: prefetch ref count went negative — mismatched calls.' );

			}

			tile.prefetch --;

		}

	}

	_deleteTile( tile ) {

		if ( tile === this.root ) {

			throw new Error();

		}

		const { cache } = this;
		const { x, y, level } = tile;
		const key = getKey( x, y, level );
		if ( ! ( key in cache ) ) {

			throw new Error();

		}

		cache[ key ].remove();
		delete cache[ key ];

	}

	_ensureTile( x, y, level ) {

		const { cache } = this;
		const key = getKey( x, y, level );
		if ( key in cache ) {

			return cache[ key ];

		}

		const child = new MVTTile();
		child.x = x;
		child.y = y;
		child.level = level;

		const parentX = x >> 1;
		const parentY = y >> 1;
		const parentLevel = level - 1;
		const parent = this._ensureTile( parentX, parentY, parentLevel );
		parent.addChild( child );

		cache[ child.getKey() ] = child;
		return child;

	}

}
