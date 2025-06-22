class PriorityQueue {

	// returns whether tasks are queued or actively running
	get running() {

		return this.items.length !== 0 || this.currJobs !== 0;

	}

	constructor() {

		// options
		this.maxJobs = 6;

		this.items = [];
		this.callbacks = new Map();
		this.currJobs = 0;
		this.scheduled = false;
		this.autoUpdate = true;

		this.priorityCallback = () => {

			throw new Error( 'PriorityQueue: PriorityCallback function not defined.' );

		};

		// Customizable scheduling callback. Default using requestAnimationFrame()
		this.schedulingCallback = func => {

			requestAnimationFrame( func );

		};

		this._runjobs = () => {

			this.scheduled = false;
			this.tryRunJobs();

		};

	}

	sort() {

		const priorityCallback = this.priorityCallback;
		const items = this.items;
		items.sort( priorityCallback );

	}

	has( item ) {

		return this.callbacks.has( item );

	}

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

			items.push( item );
			callbacks.set( item, data );

			if ( this.autoUpdate ) {

				this.scheduleJobRun();

			}

		} );

		return data.promise;

	}

	remove( item ) {

		const items = this.items;
		const callbacks = this.callbacks;

		const index = items.indexOf( item );
		if ( index !== - 1 ) {

			// reject the promise to ensure there are no dangling promises - add a
			// catch here to handle the case where the promise was never used anywhere
			// else.
			const info = callbacks.get( item );
			info.promise.catch( () => {} );
			info.reject( new Error( 'PriorityQueue: Item removed.' ) );

			items.splice( index, 1 );
			callbacks.delete( item );

		}

	}

	removeByFilter( filter ) {

		const { items } = this;
		for ( let i = 0; i < items.length; i ++ ) {

			const item = items[ i ];
			if ( filter( item ) ) {

				this.remove( item );

			}

		}

	}

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

	scheduleJobRun() {

		if ( ! this.scheduled ) {

			this.schedulingCallback( this._runjobs );

			this.scheduled = true;

		}

	}

}

export { PriorityQueue };
