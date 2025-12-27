export class DelayQueueItemRemovedError extends Error {

	constructor() {

		super( 'DelayQueue: Item removed' );
		this.name = 'DelayQueueItemRemovedError';

	}

}

export class DelayQueue {

	get delay() {

		return this._delay;

	}

	set delay( value ) {

		this._delay = value;
		this._scheduleTimeout( true );

	}

	constructor() {

		this._delay = 0;
		this.items = [];
		this.itemSet = new Set();
		this.timeoutId = null;

	}

	add( item, callback ) {

		const data = {
			item,
			callback,
			time: performance.now(),
			reject: null,
			resolve: null,
		};

		data.promise = new Promise( ( resolve, reject ) => {

			data.resolve = resolve;
			data.reject = reject;

			this.items.push( data );
			this.itemSet.add( item );
			this._scheduleTimeout();

		} );

		return data.promise;

	}

	remove( item ) {

		const { items, itemSet } = this;
		if ( ! itemSet.has( item ) ) {

			return;

		}

		const index = items.findIndex( data => data.item === item );
		if ( index !== - 1 ) {

			const data = items[ index ];
			data.promise.catch( err => {

				if ( ! ( err instanceof DelayQueueItemRemovedError ) ) {

					throw err;

				}

			} );
			data.reject( new DelayQueueItemRemovedError() );
			items.splice( index, 1 );
			itemSet.delete( item );

		}

	}

	_scheduleTimeout( force = false ) {

		if ( force && this.timeoutId !== null ) {

			clearTimeout( this.timeoutId );
			this.timeoutId = null;

		}

		if ( this.timeoutId !== null || this.items.length === 0 ) {

			return;

		}

		const now = performance.now();
		const firstItem = this.items[ 0 ];
		const readyTime = firstItem.time + this.delay;
		const remainingTime = Math.max( 0, readyTime - now );

		this.timeoutId = setTimeout( () => {

			this._processEntries();

		}, remainingTime );

	}

	_processEntries() {

		const now = performance.now();
		const { items, delay, itemSet } = this;

		let toRemove = 0;
		for ( let i = 0; i < items.length; i ++ ) {

			const { item, callback, resolve, reject, time } = items[ i ];
			const readyTime = time + delay;
			if ( readyTime > now ) {

				break;

			}

			toRemove ++;
			itemSet.delete( item );

			let result;
			try {

				result = callback( item );

			} catch ( err ) {

				reject( err );
				continue;

			}

			if ( result instanceof Promise ) {

				result.then( resolve ).catch( reject );

			} else {

				resolve( result );

			}

		}

		if ( toRemove > 0 ) {

			items.splice( 0, toRemove );

		}

		this._scheduleTimeout();

	}

}
