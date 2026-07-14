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

		// the "force" keep-alive state recorded by the last visibility pass, consumed by the next
		// state pass to keep timers and loads alive while an ancestor target loads
		this.forced = false;

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

		// first pass: advance timers, maintain sibling sets, and kick off loads so the visibility
		// pass sees this frame's final loading state - including synchronous cache-hit loads
		updateState( root );

		// second pass: resolve visibility now that every load for the frame has been started
		updateVisibility( root );

		_toPrune.forEach( tile => this._deleteTile( tile ) );
		_toPrune.clear();

		function updateState( tile ) {

			// whether this tile's content is wanted - targeted directly or pulled in as part of a
			// displayed sibling set. The keep-alive "forced" state comes from the last visibility
			// pass, keeping timers and loads alive for visible tiles covering a loading ancestor.
			const targeted = tile.target > 0 || tile.siblingForced;
			const forcedTarget = tile.visible && tile.forced;

			// increment / decrement timers for determining whether to hide / show content
			if ( targeted || forcedTarget ) {

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
					// state before any async callbacks can observe it
					if ( tile.loadingState !== UNLOADED ) {

						scope.contentCache.release( tile.x, tile.y, tile.level );
						tile.loadingState = UNLOADED;

					}

				}

			}

			// Active after show delay; stays active through the hide delay so visible tiles don't flash
			const isTargetTile = ( targeted ? tile.showTimer === TIMER_DURATION : tile.showTimer > 0 ) || forcedTarget;

			// Kick off load once the show timer commits to this tile
			if ( isTargetTile && tile.loadingState === UNLOADED ) {

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

			// when loadSiblings is true, a targeted child ensures all four siblings exist and forces
			// them to load so this tile never has to display for partial coverage
			const { children } = tile;
			if ( scope.loadSiblings ) {

				let anyChildTargeted = false;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					if ( child !== null && child.target > 0 ) {

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

		function updateVisibility( tile, force = false, siblingsReady = true ) {

			const targeted = tile.target > 0 || tile.siblingForced;
			const forcedTarget = tile.visible && force;

			// record the keep-alive state for the next frame's state pass
			tile.forced = force;

			// Active after show delay; stays active through the hide delay so visible tiles don't flash
			const isTargetTile = ( targeted ? tile.showTimer === TIMER_DURATION : tile.showTimer > 0 ) || forcedTarget;

			let setVisible = false;
			if ( targeted || forcedTarget ) {

				// the tile can only display once loaded and, when displaying sibling sets, once the
				// whole set is ready so the quad swaps in together. Tiles forced to stay visible
				// bypass the sibling gate so already-displayed content isn't hidden mid-transition.
				if ( tile.loadingState === LOADED && ( siblingsReady || forcedTarget ) ) {

					setVisible = true;
					force = false;

				} else if ( isTargetTile ) {

					force = true;

				}

			}

			// the sibling set below is ready to display once every sibling has finished loading -
			// failed tiles count as ready and display as missing content
			const { children } = tile;
			let childSiblingsReady = true;
			if ( scope.loadSiblings ) {

				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					if ( child === null || ( child.loadingState !== LOADED && child.loadingState !== FAILED ) ) {

						childSiblingsReady = false;

					}

				}

			}

			// showTimer > 0 keeps tiles with in-flight loads from being pruned mid-hysteresis
			let tileRequired = tile.visible || targeted || tile.showTimer > 0;
			let childrenNeedCoverage = false;

			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					tileRequired = updateVisibility( child, force, childSiblingsReady ) || tileRequired;

					// failed tiles can never display, so they don't require coverage when sibling
					// sets are displayed - the quad shows with missing content instead
					const childTargeted = child.target > 0 || child.siblingForced;
					const childBlocked = scope.loadSiblings && child.loadingState === FAILED;
					childrenNeedCoverage = childrenNeedCoverage || ( childTargeted && ! child.visible && ! childBlocked );

				}

			}

			if ( childrenNeedCoverage && tile.loadingState === LOADED ) {

				setVisible = true;

			}

			// when the full sibling set below this tile is displayed the children replace this
			// tile's content entirely, so it doesn't display even when targeted. Failed children
			// count as displayed as long as at least one sibling is actually visible.
			if ( scope.loadSiblings && setVisible && tile.childCount === 4 ) {

				let allDisplayed = true;
				let anyVisible = false;
				for ( let i = 0, l = children.length; i < l; i ++ ) {

					const child = children[ i ];
					if ( ! child.visible && child.loadingState !== FAILED ) {

						allDisplayed = false;

					}

					anyVisible = anyVisible || child.visible;

				}

				if ( allDisplayed && anyVisible ) {

					setVisible = false;

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
