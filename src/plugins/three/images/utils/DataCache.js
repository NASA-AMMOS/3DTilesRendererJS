function hash( ...args ) {

	return args.join( '_' );

}

// class for retrieving and locking data being requested
// "fetchItem" and "disposeItem" should be implemented
export class DataCache {

	constructor() {

		this.cache = {};

	}

	// overridable
	fetchItem() {}
	disposeItem() {}

	// sets the data in the cache explicitly without need to load
	setData( ...args ) {

		const { cache } = this;
		const data = args.pop();
		const key = hash( ...args );
		if ( key in cache ) {

			throw new Error( `DataCache: "${ key }" is already present.` );

		} else {

			this.cache[ key ] = {
				abortController: new AbortController(),
				result: data,
				count: 1,
			};

		}

		return data;

	}

	// fetches the associated data if it doesn't exist and increments the lock counter
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

			info.result = this.fetchItem( ...args, abortController.signal )
				.then( res => {

					info.result = res;
					return res;

				} );

			this.cache[ key ] = info;

		}

		return cache[ key ].result;

	}

	// decrements the lock counter for the item and deletes the item if it has reached zero
	release( ...args ) {

		const { cache } = this;
		const key = hash( ...args );
		if ( key in cache ) {

			// decrement the lock
			const info = cache[ key ];
			info.count --;

			// if the item is no longer being used
			if ( info.count === 0 ) {

				const { result, abortController } = info;
				abortController.abort();

				// dispose of the object even if it still is in progress
				if ( result instanceof Promise ) {

					// "disposeItem" will throw potentially if fetch, etc are cancelled using the abort signal
					result.then( item => this.disposeItem( item ) ).catch( () => {} );

				} else {

					this.disposeItem( result );

				}

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
		if ( key in cache ) {

			return cache[ key ].result;

		} else {

			return null;

		}

	}

	// dispose all items
	dispose() {

		const { cache } = this;
		for ( const key in cache ) {

			const { abortController, result } = cache[ key ];
			abortController.abort();

			if ( result instanceof Promise ) {

				result.then( item => this.disposeItem( item ) ).catch( () => {} );

			} else {

				this.disposeItem( result );

			}

		}

		this.cache = {};

	}

}
