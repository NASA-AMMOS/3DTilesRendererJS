/**
 * Error thrown when a queued item's promise is rejected because the item was removed
 * before its callback could run.
 *
 * @extends Error
 */
export class PriorityQueueItemRemovedError extends Error {

	constructor() {

		super( 'PriorityQueue: Item removed' );
		this.name = 'PriorityQueueItemRemovedError';

	}

}

/**
 * @callback PriorityCallback
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */

/**
 * @callback SchedulingCallback
 * @param {Function} func
 */

/**
 * @callback ItemCallback
 * @param {any} item
 * @returns {Promise<any>|any}
 */

/**
 * @callback FilterCallback
 * @param {any} item
 * @returns {boolean}
 */

/**
 * Priority queue for scheduling async work with a concurrency limit. Items are
 * sorted by `priorityCallback` and dispatched up to `maxJobs` at a time.
 */
export class PriorityQueue {

	// returns whether tasks are queued or actively running
	get running() {

		return this.items.length !== 0 || this.currJobs !== 0;

	}

	constructor() {

		/**
		 * Maximum number of jobs that can run concurrently.
		 * @type {number}
		 */
		this.maxJobs = 6;

		this.items = [];
		this.callbacks = new Map();
		this.currJobs = 0;
		this.scheduled = false;

		/**
		 * If true, job runs are automatically scheduled after `add` and after each job completes.
		 * @type {boolean}
		 */
		this.autoUpdate = true;

		/**
		 * Comparator used to sort queued items. Higher-priority items should sort last
		 * (i.e. return positive when `itemA` should run before `itemB`). Defaults to `null`.
		 * @type {PriorityCallback|null}
		 */
		this.priorityCallback = null;

		/**
		 * Callback used to schedule when to run jobs next, so more work doesn't happen in a
		 * single frame than there is time for. Defaults to `requestAnimationFrame`. Should be
		 * overridden in scenarios where `requestAnimationFrame` is not reliable, such as when
		 * running in WebXR.
		 * @type {SchedulingCallback}
		 */
		this.schedulingCallback = func => {

			requestAnimationFrame( func );

		};

		this._runjobs = () => {

			this.scheduled = false;
			this.tryRunJobs();

		};

	}

	/**
	 * Sorts the pending item list using `priorityCallback`, if set.
	 */
	sort() {

		const priorityCallback = this.priorityCallback;
		const items = this.items;
		if ( priorityCallback !== null ) {

			items.sort( priorityCallback );

		}

	}

	/**
	 * Returns whether the given item is currently queued.
	 * @param {any} item
	 * @returns {boolean}
	 */
	has( item ) {

		return this.callbacks.has( item );

	}

	/**
	 * Adds an item to the queue and returns a Promise that resolves when the item's
	 * callback completes, or rejects if the item is removed before running.
	 * @param {any} item
	 * @param {ItemCallback} callback - Invoked with `item` when it is dequeued; may return a Promise
	 * @returns {Promise<any>}
	 */
	add( item, callback ) {

		const data = {
			callback,
			reject: null,
			resolve: null,
			promise: null,
		};

		data.promise = new Promise( ( resolve, reject ) => {

			const items = this.items;
			const callbacks = this.callbacks;

			data.resolve = resolve;
			data.reject = reject;

			items.unshift( item );
			callbacks.set( item, data );

			if ( this.autoUpdate ) {

				this.scheduleJobRun();

			}

		} );

		return data.promise;

	}

	/**
	 * Removes an item from the queue, rejecting its promise with `PriorityQueueItemRemovedError`.
	 * @param {any} item
	 */
	remove( item ) {

		const items = this.items;
		const callbacks = this.callbacks;

		const index = items.indexOf( item );
		if ( index !== - 1 ) {

			// reject the promise to ensure there are no dangling promises - add a
			// catch here to handle the case where the promise was never used anywhere
			// else.
			const info = callbacks.get( item );
			info.promise.catch( err => {

				if ( ! ( err instanceof PriorityQueueItemRemovedError ) ) {

					throw err;

				}

			} );
			info.reject( new PriorityQueueItemRemovedError() );

			items.splice( index, 1 );
			callbacks.delete( item );

		}

	}

	/**
	 * Removes all queued items for which `filter` returns true.
	 * @param {FilterCallback} filter - Called with each item; return true to remove
	 */
	removeByFilter( filter ) {

		const { items } = this;
		for ( let i = 0; i < items.length; i ++ ) {

			const item = items[ i ];
			if ( filter( item ) ) {

				this.remove( item );
				i --;

			}

		}

	}

	/**
	 * Immediately attempts to dequeue and run pending jobs up to `maxJobs` concurrency.
	 */
	tryRunJobs() {

		this.sort();

		const items = this.items;
		const callbacks = this.callbacks;
		const maxJobs = this.maxJobs;
		let iterated = 0;

		const completedCallback = () => {

			this.currJobs --;

			if ( this.autoUpdate ) {

				this.scheduleJobRun();

			}

		};

		while ( maxJobs > this.currJobs && items.length > 0 && iterated < maxJobs ) {

			this.currJobs ++;
			iterated ++;
			const item = items.pop();
			const { callback, resolve, reject } = callbacks.get( item );
			callbacks.delete( item );

			let result;
			try {

				result = callback( item );

			} catch ( err ) {

				reject( err );
				completedCallback();

			}

			if ( result instanceof Promise ) {

				result
					.then( resolve )
					.catch( reject )
					.finally( completedCallback );

			} else {

				resolve( result );
				completedCallback();

			}

		}

	}

	/**
	 * Schedules a deferred call to `tryRunJobs` via `schedulingCallback`.
	 */
	scheduleJobRun() {

		if ( ! this.scheduled ) {

			this.schedulingCallback( this._runjobs );

			this.scheduled = true;

		}

	}

}
