import { EventDispatcher } from 'three';

const getKey = ( x, y, l ) => {

	return `${ x }_${ y }_${ l }`;

};

// Ref-counts active requests per (x, y, level) tile and fires a 'toggle' event when a tile
// transitions between inactive (ref === 0) and active (ref > 0). Multiple LoD levels covering
// the same area can be active simultaneously — deduplication is handled upstream.
export class HierarchicalLock extends EventDispatcher {

	constructor() {

		super();

		this.locks = {};

	}

	markActive( x, y, level ) {

		this._accrue( x, y, level, true );

	}

	markInactive( x, y, level ) {

		this._accrue( x, y, level, false );

	}

	// Keep the nearest already-active ancestor alive while a finer tile is loading.
	// Call unmarkLoading on every exit path (success, cancel, or dispose).
	markLoading( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		let ax = x;
		let ay = y;
		let al = level;

		if ( ! ( childKey in locks ) ) {

			locks[ childKey ] = this._createLock( x, y, level );

		}

		// traverse the ancestors to find the nearest active one and keep it alive
		while ( al > 0 ) {

			al --;
			ax >>= 1;
			ay >>= 1;

			const ancestorKey = getKey( ax, ay, al );
			if ( ancestorKey in locks ) {

				this._accrue( ax, ay, al, true );
				locks[ childKey ].lockedAncestor = {
					x: ax,
					y: ay,
					level: al,
				};
				break;

			}

		}

	}

	unmarkLoading( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		const childLock = locks[ childKey ];
		if ( ! childLock ) {

			return;

		}

		if ( childLock.lockedAncestor ) {

			const { x: ax, y: ay, level: al } = childLock.lockedAncestor;
			this._accrue( ax, ay, al, false );
			childLock.lockedAncestor = null;

		}

		this._tryDeleteLock( childKey );

	}

	//

	_tryDeleteLock( key ) {

		const lock = this.locks[ key ];
		if ( lock && lock.ref === 0 && lock.lockedAncestor === null ) {

			delete this.locks[ key ];

		}

	}

	_createLock( x, y, level ) {

		return {
			x,
			y,
			level,
			ref: 0,
			dispatched: false,
			lockedAncestor: null,
		};

	}

	_accrue( x, y, level, incr ) {

		const { locks } = this;
		const key = getKey( x, y, level );

		if ( ! ( key in locks ) ) {

			locks[ key ] = this._createLock( x, y, level );

		}

		const lock = locks[ key ];
		lock.ref += incr ? 1 : - 1;
		if ( lock.ref < 0 ) {

			throw new Error();

		}

		const active = lock.ref > 0;
		if ( active !== lock.dispatched ) {

			lock.dispatched = active;
			this.dispatchEvent( { type: 'toggle', active, x, y, level } );

		}

		this._tryDeleteLock( key );

	}

}
