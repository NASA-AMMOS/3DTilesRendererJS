import { PriorityQueue } from '../../../../utilities/PriorityQueue.js';

function hash( ...args ) {

	return args.join( '_' );

}

// class for retrieving and locking data being requested
export class DataCache {

	constructor() {

		this.loadQueue = new PriorityQueue();
		this.cache = {};
		this.fetchItem = null;
		this.disposeItem = null;

	}

	// fetches the associated data if it doesn't exist and increments the lock counter
	lock( ...args ) {

		const { cache } = this;
		const key = hash( ...args );
		if ( key in cache ) {

			cache[ key ].count ++;

		} else {

			const abortController = new AbortController();
			const result = this.loadQueue.add( key, () => {

				return this.fetchItem( ...args, abortController.signal );

			} );

			this.cache[ key ] = {
				abortController,
				result,
				count: 1,
			};

		}

		return cache[ key ].result;

	}

	// decrements the lock counter for the item and deletes the item if it has reached zero
	release( ...args ) {

		const { cache, loadQueue } = this;
		const key = hash( ...args );
		if ( key in cache ) {

			cache[ key ].count --;
			if ( cache[ key ].count === 0 ) {

				loadQueue.remove( key );
				cache[ key ].signal.abort();
				cache[ key ].result.then( item => {

					this.disposeItem( item );

				} );

				delete cache[ key ];

			}

			return true;

		}

		return false;

	}

	// get the loaded item
	get( ...args ) {

		const { cache } = this;
		const key = hash( ...args );
		if ( cache[ key ] ) {

			return cache[ key ].result;

		} else {

			return null;

		}

	}

	// dispose all items
	dispose() {

		const { cache, loadQueue } = this;
		for ( const key in cache ) {

			loadQueue.remove( key );
			cache[ key ].abortController.abort();
			cache[ key ].result.then( item => {

				this.disposeItem( item );

			} );

		}

		this.cache = {};

	}

}
