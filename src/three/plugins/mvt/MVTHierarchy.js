import { EventDispatcher } from 'three';

const UNLOADED = 0;
const LOADING = 1;
const LOADED = 2;
const FAILED = 3;

function getChildKey( x, y ) {

	return ( x * 1 ) | ( y * 2 );

}

function getKey( x, y, level ) {

	return `${ this.x }_${ this.y }_${ this.level }`;

}

class MVTTile {

	constructor() {

		this.parent = null;
		this.x = 0;
		this.y = 0;
		this.level = 0;

		this.children = new Array( 4 ).fill( null );
		this.childCount = 0;

		this.loadState = UNLOADED;
		this.visible = false;
		this.target = false;

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

		this.root = new MVTTile( this );
		this.toPrune = new Set();
		this.cache = {
			[ this.root.getKey() ]: this.root,
		};
		this.contentCache = content;

	}

	update() {

		const { root } = this;
		traverse( root );

		_toPrune.forEach( tile => this._deleteTile( tile ) );
		_toPrune.clear();

		function traverse( tile, force = false ) {

			// TODO: only consider a tile a target after a
			// certain amount of time? Same for after hiding?
			// Use a timer on the tile to count up and down.
			const isTargetTile = tile.target > 0;
			let setVisible = false;
			if ( isTargetTile || force ) {

				if ( tile.loadingState === LOADED ) {

					setVisible = true;
					force = false;

				} else if ( isTargetTile ) {

					force = true;

					// TODO: trigger a download after a delay?

				}

			}

			if ( setVisible !== tile.visible ) {

				tile.visible = setVisible;

				// TODO: dispose here? Dispose after a delay?

				this.dispatchEvent( {
					type: 'toggle',
					visible: setVisible,
					x: tile.x,
					y: tile.y,
					level: tile.level,
				} );

			}

			// iterate over all children
			const { children } = tile;
			let tileRequired = tile.visible || tile.target > 0;
			for ( let i = 0, l = children.length; i < l; i ++ ) {

				const child = children[ i ];
				if ( child !== null ) {

					tileRequired ||= traverse( tile, force );

				}

			}

			// mark this tile to prune if it's not necessary
			if ( ! tileRequired ) {

				_toPrune.add( this );

			}

			// if this tile is required because a child is required or the tile is visible
			return tileRequired || this.visible;

		}

	}

	setLoadingState( x, y, l, state ) {

		// initialize the loading state

	}

	setTargetState( x, y, l, target ) {

		// set target reference count

	}

	_deleteTile( tile ) {

		const { cache } = this;
		const { x, y, level } = this;
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

		const child = new MVTTile( this );
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
