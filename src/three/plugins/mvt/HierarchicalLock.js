import { EventDispatcher } from 'three';

const getKey = ( x, y, l ) => {

	return `${ x }_${ y }_${ l }`;

};

// Ref-counts active requests per (x, y, level) tile and fires a 'toggle' event when a tile
// transitions between inactive (ref === 0) and active (ref > 0). Tiles can also be marked as
// "loading", which will lock an existing parent tile as active to ensure coverage until the
// child has loaded
export class HierarchicalLock extends EventDispatcher {

	constructor() {

		super();

		this.locks = {};

	}

	// mark the tile as "active", meaning it should be visible
	markActive( x, y, level ) {

		this._incrLock( x, y, level, true );

	}

	markInactive( x, y, level ) {

		this._incrLock( x, y, level, false );

	}

	// Mark the tile as "loading", which means one of the present parent tiles should
	// be kept around.
	markLoading( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		let ax = x;
		let ay = y;
		let al = level;

		// Create the lock for the child and mark it as loading
		if ( ! ( childKey in locks ) ) {

			locks[ childKey ] = this._createLock( x, y, level );

		}

		const childLock = locks[ childKey ];
		childLock.loadingCount ++;

		// Only lock the ancestor on the first markLoading call — subsequent concurrent
		// loads for the same tile share the same ancestor hold
		if ( childLock.loadingCount === 1 ) {

			while ( al > 0 ) {

				al --;
				ax >>= 1;
				ay >>= 1;

				const ancestorKey = getKey( ax, ay, al );
				if ( ancestorKey in locks ) {

					// save the reference so we can unlock it later when load is finished
					this._incrLock( ax, ay, al, true );
					childLock.lockedAncestor = { x: ax, y: ay, level: al };
					break;

				}

			}

		}

	}

	unmarkLoading( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		const childLock = locks[ childKey ];

		if ( ! childLock ) {

			throw new Error( 'HierarchicalLock: unmarkLoading called without a matching markLoading.' );

		}

		childLock.loadingCount --;

		// Release the ancestor only when the last concurrent load finishes
		if ( childLock.loadingCount === 0 && childLock.lockedAncestor ) {

			const { x: ax, y: ay, level: al } = childLock.lockedAncestor;
			this._incrLock( ax, ay, al, false );
			childLock.lockedAncestor = null;

		}

		this._tryDeleteLock( childKey );

	}

	//

	_tryDeleteLock( key ) {

		const lock = this.locks[ key ];
		if ( lock && lock.ref === 0 && lock.lockedAncestor === null && lock.loadingCount === 0 ) {

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
			loadingCount: 0,
		};

	}

	_incrLock( x, y, level, incr ) {

		const { locks } = this;
		const key = getKey( x, y, level );

		if ( ! ( key in locks ) ) {

			locks[ key ] = this._createLock( x, y, level );

		}

		const lock = locks[ key ];
		lock.ref += incr ? 1 : - 1;
		if ( lock.ref < 0 ) {

			throw new Error( 'HierarchicalLock: ref count went negative — mismatched markActive/markInactive calls.' );

		}

		const active = lock.ref > 0;
		if ( active !== lock.dispatched ) {

			lock.dispatched = active;
			this.dispatchEvent( { type: 'toggle', active, x, y, level } );

		}

		this._tryDeleteLock( key );

	}

}
