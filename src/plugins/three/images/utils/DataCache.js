import { PriorityQueue } from '../../../../utilities/PriorityQueue.js';

function hash( ...args ) {

	return args.join( '_' );

}

// class for retrieving and locking data being requested
export class DataCache {

	constructor() {

		this.loadQueue = new PriorityQueue();
		this.loadQueue.priorityCallback = () => 0;
		this.cache = {};

	}

	fetchItem() {}
	disposeItem() {}

	// fetches the associated data if it doesn't exist and increments the lock counter
	setData( ...args ) {

		const { cache } = this;
		const data = args.pop();
		const key = hash( ...args );
		if ( key in cache ) {

			throw new Error();

		} else {

			this.cache[ key ] = {
				abortController: new AbortController(),
				result: data,
				count: 1,
			};

		}

		return data;

	}

	lock( ...args ) {

		const { cache } = this;
		const key = hash( ...args );
		if ( key in cache ) {

			cache[ key ].count ++;

		} else {

			const abortController = new AbortController();
			const info = {
				abortController,
				result: null,
				count: 1,
			};

			info.result = this.loadQueue.add( key, async () => {

				const res = await this.fetchItem( ...args, abortController.signal );
				info.result = res;
				return res;

			} );

			this.cache[ key ] = info;

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

				const { result, abortController } = cache[ key ];
				abortController.abort();
				if ( result instanceof Promise ) {

					result.then( item => this.disposeItem( item ) ).catch( () => {} );

				} else {

					this.disposeItem( result );

				}

				loadQueue.remove( key );

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

			const { abortController, result } = cache[ key ];
			abortController.abort();
			if ( result instanceof Promise ) {

				result.then( item => this.disposeItem( item ) );

			} else {

				this.disposeItem( result );

			}

		}

		this.cache = {};

	}

}
