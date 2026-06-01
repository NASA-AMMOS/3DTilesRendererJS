import { EventDispatcher } from 'three';

const getKey = ( x, y, l ) => {

	return `${ x }_${ y }_${ l }`;

};

// "available" indicates that a tile should be loaded and available
// "active" indicates the given tile is visible and should be displayed, overriding all parents
// If a single child is marked as active then all siblings are, as well, to prevent gaps
// TODO: This may need to handle async operations or perhaps a separate data structure should be used for
// "available" vs "active"?
export class HierarchicalLock extends EventDispatcher {

	constructor() {

		super();

		this.locks = {};

	}

	markActive( x, y, level ) {

		this._accrueActive( x, y, level, true );

	}

	markInactive( x, y, level ) {

		this._accrueActive( x, y, level, false );

	}

	//

	_initLock( x, y, l ) {

		const { locks } = this;
		const key = getKey( x, y, l );
		if ( ! ( key in locks ) ) {

			locks[ key ] = {
				x,
				y,
				level: l,
				present: 0,
				ref: 0,
				override: 0,
				activeDispatched: false,
				presentDispatched: false,
			};

		}

	}

	_accrueRef( key, incr ) {

		const { locks } = this;
		locks[ key ].ref += incr ? 1 : - 1;
		if ( locks[ key ].ref < 0 ) {

			throw new Error();

		}

	}

	_accrueOverride( key, incr ) {

		const { locks } = this;
		locks[ key ].override += incr ? 1 : - 1;
		if ( locks[ key ].override < 0 ) {

			throw new Error();

		}

	}

	_resolveEvents( key ) {

		const { locks } = this;
		const lock = locks[ key ];
		const active = lock.ref > 0 && lock.override === 0;
		if ( active !== lock.activeDispatched ) {

			const { x, y, level } = lock;
			lock.activeDispatched = active;
			this.dispatchEvent( {
				type: 'active-toggle',
				active, x, y, level,
			} );

		}

		if ( Boolean( lock.present ) !== lock.presentDispatched ) {

			const { x, y, level } = lock;
			lock.activeDispatched = lock.present;
			this.dispatchEvent( {
				type: 'present-toggle',
				active, x, y, level,
			} );

		}

		if ( lock.ref === 0 && lock.override === 0 && lock.present === 0 ) {

			delete locks[ key ];

		}

	}

	_accrueActive( x, y, level, incr ) {

		let key = getKey( x, y, level );
		this._initLock( x, y, level );
		this._accrueRef( key, incr );
		this._resolveEvents( key );

		while ( level > 0 ) {

			level --;
			x >>= 1;
			y >>= 1;

			let key = getKey( x, y, level );
			this._initLock( x, y, level );
			this._accrueOverride( key, incr );
			this._resolveEvents( key );

		}

	}

}
