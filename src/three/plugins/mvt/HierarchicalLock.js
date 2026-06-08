import { EventDispatcher } from 'three';

const getKey = ( x, y, l ) => {

	return `${ x }_${ y }_${ l }`;

};

// Ref-counts active requests per (x, y, level) tile and fires a 'toggle' event when a tile
// transitions between inactive and active. A tile is considered active when its own 'active'
// ref is non-zero AND it has no in-flight loads of its own ('loading' === 0). Tiles can also
// be marked as "loading", which will lock an existing parent tile as active to ensure coverage
// until the child has loaded.
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
		childLock.loading ++;
		this._checkToggle( childKey );

		// Only lock the ancestor on the first markLoading call — subsequent concurrent
		// loads for the same tile share the same ancestor hold
		if ( childLock.loading === 1 ) {

			while ( al > 0 ) {

				al --;
				ax >>= 1;
				ay >>= 1;

				const ancestorKey = getKey( ax, ay, al );
				if ( ancestorKey in locks && locks[ ancestorKey ].dispatched ) {

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

		childLock.loading --;
		this._checkToggle( childKey );

		// Release the ancestor only when the last concurrent load finishes
		if ( childLock.loading === 0 && childLock.lockedAncestor ) {

			const { x: ax, y: ay, level: al } = childLock.lockedAncestor;
			this._incrLock( ax, ay, al, false );
			childLock.lockedAncestor = null;

		}

		this._tryDeleteLock( childKey );

	}

	//

	_tryDeleteLock( key ) {

		const lock = this.locks[ key ];
		if ( lock && lock.active === 0 && lock.lockedAncestor === null && lock.loading === 0 ) {

			delete this.locks[ key ];

		}

	}

	_createLock( x, y, level ) {

		return {
			x,
			y,
			level,
			active: 0,
			loading: 0,
			dispatched: false,
			lockedAncestor: null,
		};

	}

	_checkToggle( key ) {

		const { locks } = this;
		const lock = locks[ key ];
		if ( ! lock ) {

			return;

		}

		const shouldShow = lock.loading === 0 && lock.active > 0;
		if ( shouldShow !== lock.dispatched ) {

			lock.dispatched = shouldShow;
			this.dispatchEvent( { type: 'toggle', active: shouldShow, x: lock.x, y: lock.y, level: lock.level } );

		}

	}

	_incrLock( x, y, level, incr ) {

		const { locks } = this;
		const key = getKey( x, y, level );

		if ( ! ( key in locks ) ) {

			locks[ key ] = this._createLock( x, y, level );

		}

		const lock = locks[ key ];
		lock.active += incr ? 1 : - 1;
		if ( lock.active < 0 ) {

			throw new Error( 'HierarchicalLock: ref count went negative — mismatched markActive/markInactive calls.' );

		}

		this._checkToggle( key );
		this._tryDeleteLock( key );

	}

}
