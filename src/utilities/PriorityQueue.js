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

			this.tryRunJobs();
			this.scheduled = false;

		};

	}

	sort() {

		const priorityCallback = this.priorityCallback;
		const items = this.items;
		items.sort( priorityCallback );

	}

	add( item, callback ) {

		return new Promise( ( resolve, reject ) => {

			const prCallback = ( ...args ) => callback( ...args ).then( resolve ).catch( reject );
			const items = this.items;
			const callbacks = this.callbacks;

			items.push( item );
			callbacks.set( item, prCallback );

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
		let currJobs = this.currJobs;
		while ( maxJobs > currJobs && items.length > 0 ) {

			currJobs ++;
			const item = items.pop();
			const callback = callbacks.get( item );
			callbacks.delete( item );
			callback( item )
				.then( () => {

					this.currJobs --;

					if ( this.autoUpdate ) {

						this.scheduleJobRun();

					}

				} )
				.catch( () => {

					this.currJobs --;

					if ( this.autoUpdate ) {

						this.scheduleJobRun();

					}

				} );

		}
		this.currJobs = currJobs;

	}

	scheduleJobRun() {

		if ( ! this.scheduled ) {

			this.schedulingCallback( this._runjobs );

			this.scheduled = true;

		}

	}

}

export { PriorityQueue };
