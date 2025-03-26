class PriorityQueue {

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

		return new Promise( ( resolve, reject ) => {

			const items = this.items;
			const callbacks = this.callbacks;

			items.push( item );
			callbacks.set( item, {
				callback,
				resolve,
				reject,
			} );

			if ( this.autoUpdate ) {

				this.scheduleJobRun();

			}

		} );

	}

	remove( item ) {

		const items = this.items;
		const callbacks = this.callbacks;

		const index = items.indexOf( item );
		if ( index !== - 1 ) {

			items.splice( index, 1 );
			callbacks.delete( item );

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
