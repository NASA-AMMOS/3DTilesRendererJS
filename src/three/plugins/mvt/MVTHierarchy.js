import { EventDispatcher } from 'three';

const UNLOADED = 0;
const LOADING = 1;
const LOADED = 2;
const FAILED = 3;

function getChildKey( x, y ) {

	return ( x * 1 ) | ( y * 2 );

}

function getKey( x, y, level ) {

	return `${ x }_${ y }_${ level }`;

}

const TIMER = 500;

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

	constructor( content ) {

		super();

		this.root = new MVTTile();
		this.cache = {
			[ this.root.getKey() ]: this.root,
		};
		this.contentCache = content;
		this._lastTime = - 1;

	}

	update() {

		const now = performance.now();
		const lastTime = this._lastTime === - 1 ? now : this._lastTime;
		const dt = now - lastTime;
		this._lastTime = now;

		const { root } = this;
		const scope = this;
		traverse( root );

		_toPrune.forEach( tile => this._deleteTile( tile ) );
		_toPrune.clear();

		function traverse( tile, force = false ) {

			// increment / decrement timers for determining whether to hide / show content
			if ( tile.target > 0 ) {

				tile.showTimer += dt;
				tile.showTimer = Math.min( tile.showTimer, TIMER );
				if ( tile.showTimer === TIMER ) {

					tile.hideTimer = 0;

				}

			} else {

				tile.hideTimer += dt;
				tile.hideTimer = Math.min( tile.hideTimer, TIMER );
				if ( tile.hideTimer === TIMER ) {

					tile.showTimer = 0;

					if ( tile.loadingState !== UNLOADED ) {

						scope.contentCache.release( tile.x, tile.y, tile.level );
						tile.loadingState = UNLOADED;

					}

				}

			}

			// Active after show delay; stays active through the hide delay so visible tiles don't flash
			const isTargetTile = tile.target > 0 ? tile.showTimer >= TIMER : tile.showTimer > 0;

			// Kick off load once the show timer commits to this tile
			if ( isTargetTile && tile.loadingState === UNLOADED ) {

				tile.loadingState = LOADING;

				const { x, y, level } = tile;
				const result = scope.contentCache.lock( x, y, level );
				if ( result instanceof Promise ) {

					result
						.then( () => {

							tile.loadingState = LOADED;

						} )
						.catch( () => {

							tile.loadingState = FAILED;

						} );

				} else {

					tile.loadingState = result !== null ? LOADED : FAILED;

				}

			}

			let setVisible = false;
			if ( isTargetTile || force ) {

				if ( tile.loadingState === LOADED ) {

					setVisible = true;
					force = false;

				} else if ( isTargetTile ) {

					force = true;

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

			// showTimer > 0 keeps tiles with in-flight loads from being pruned mid-hysteresis
			const { children } = tile;
			let tileRequired = tile.visible || tile.target > 0 || tile.showTimer > 0;
			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					tileRequired ||= traverse( child, force );

				}

			}

			if ( tile !== scope.root && ! tileRequired ) {

				_toPrune.add( tile );

			}

			return tileRequired;

		}

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

		// Release the content lock for any state that called lock(), and reset synchronously
		// before any async abort callbacks can fire
		if ( tile.loadingState !== UNLOADED ) {

			// TODO: this is being done here because it's currently difficult to determine
			// whether an item was cancelled via the abort signal, download queue, or failed.
			this.contentCache.release( x, y, level );
			tile.loadingState = UNLOADED;

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
