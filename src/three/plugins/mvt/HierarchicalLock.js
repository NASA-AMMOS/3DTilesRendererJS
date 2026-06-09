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

		this._incrActiveLock( x, y, level, true );

	}

	markInactive( x, y, level ) {

		this._incrActiveLock( x, y, level, false );

	}

	// Mark the tile as "loading", which means one of the present parent tiles should
	// be kept around.
	markLoading( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		this._ensureLock( childKey, x, y, level );

		const childLock = locks[ childKey ];
		childLock.loading ++;

		if ( childLock.loading === 1 && childLock.active > 0 ) {

			this._lockAncestor( x, y, level );

		}

		this._tryFireEvent( childKey );

	}

	unmarkLoading( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		const childLock = locks[ childKey ];
		childLock.loading --;

		if ( childLock.loading === 0 && childLock.active > 0 ) {

			this._unlockAncestor( x, y, level );

		}

		this._tryFireEvent( childKey );
		this._tryDeleteLock( childKey );

	}

	//

	_lockAncestor( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		const childLock = locks[ childKey ];
		this._ensureLock( childKey, x, y, level );
		if ( childLock.lockedAncestor ) return;

		let ax = x;
		let ay = y;
		let al = level;

		// Only lock the ancestor on the first markLoading call — subsequent concurrent
		// loads for the same tile share the same ancestor hold
		while ( al > 0 ) {

			al --;
			ax >>= 1;
			ay >>= 1;

			const ancestorKey = getKey( ax, ay, al );
			this._ensureLock( ancestorKey, ax, ay, al );
			locks[ ancestorKey ].loadingDescendants.add( childKey );

			// save the reference so we can unlock it later when load is finished
			if ( locks[ ancestorKey ].dispatched && ! childLock.lockedAncestor ) {

				this._incrActiveLock( ax, ay, al, true );
				childLock.lockedAncestor = { x: ax, y: ay, level: al };

			}

		}

	}

	_unlockAncestor( x, y, level ) {

		const { locks } = this;
		const childKey = getKey( x, y, level );
		const childLock = locks[ childKey ];
		if ( ! childLock ) return;

		// unmark the descendants list
		let ax = x;
		let ay = y;
		let al = level;
		while ( al > 0 ) {

			al --;
			ax >>= 1;
			ay >>= 1;

			const ancestorKey = getKey( ax, ay, al );
			locks[ ancestorKey ].loadingDescendants.delete( childKey );
			this._tryDeleteLock( ancestorKey );

		}

		// remove the locked ancestor
		if ( childLock.lockedAncestor ) {

			// unlock the ancestor
			const { x: lx, y: ly, level: ll } = childLock.lockedAncestor;
			this._incrActiveLock( lx, ly, ll, false );
			childLock.lockedAncestor = null;

		}

	}

	// delete the lock if all the fields have been settled
	_tryDeleteLock( key ) {

		const lock = this.locks[ key ];
		if (
			lock && lock.active === 0 &&
			lock.lockedAncestor === null &&
			lock.loading === 0 &&
			lock.loadingDescendants.size === 0
		) {

			delete this.locks[ key ];

		}

	}

	// ensure the lock exists
	_ensureLock( key, x, y, level ) {

		const { locks } = this;
		if ( ! ( key in locks ) ) {

			locks[ key ] = {
				x,
				y,
				level,
				active: 0,
				loading: 0,
				dispatched: false,
				lockedAncestor: null,
				loadingDescendants: new Set(),
			};

		}

		return locks[ key ];

	}

	// checks whether an event should be fired
	_tryFireEvent( key ) {

		const { locks } = this;
		const lock = locks[ key ];

		const shouldShow = lock.loading === 0 && lock.active > 0;
		if ( shouldShow !== lock.dispatched ) {

			lock.dispatched = shouldShow;
			this.dispatchEvent( {
				type: 'toggle',
				active: shouldShow,
				x: lock.x,
				y: lock.y,
				level: lock.level,
			} );

		}

	}

	// increments the active lock for the tile
	_incrActiveLock( x, y, level, incr ) {

		const { locks } = this;
		const key = getKey( x, y, level );
		this._ensureLock( key, x, y, level );

		const lock = locks[ key ];
		lock.active += incr ? 1 : - 1;
		if ( lock.active < 0 ) {

			throw new Error( 'HierarchicalLock: ref count went negative — mismatched markActive/markInactive calls.' );

		}

		// try to lock the ancestors if the lock became active and is loading
		if ( lock && lock.loading > 0 ) {

			if ( incr && lock.active === 1 ) {

				this._lockAncestor( x, y, level );

			} else if ( ! incr && lock.active === 0 ) {

				this._unlockAncestor( x, y, level );

			}

		}

		// replace all the existing locks up this chain
		if ( incr && lock.active === 1 ) {

			lock.loadingDescendants.forEach( key => {

				const childLock = locks[ key ];
				if ( childLock.lockedAncestor ) {

					const { x: lx, y: ly, level: ll } = childLock.lockedAncestor;
					this.markInactive( lx, ly, ll );
					lock.active ++;

					childLock.lockedAncestor.x = x;
					childLock.lockedAncestor.y = y;
					childLock.lockedAncestor.level = level;

				} else if ( lock.loading === 0 && childLock.active > 0 && childLock.loading > 0 ) {

					// No ancestor was dispatched when this descendant started loading;
					// this tile is now visible so use it as the placeholder.
					lock.active ++;
					childLock.lockedAncestor = { x, y, level };

				}

			} );

		}

		this._tryFireEvent( key );
		this._tryDeleteLock( key );

	}

}
