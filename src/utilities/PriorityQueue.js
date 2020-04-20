class PriorityQueue {

	constructor() {

		// options
		this.maxJobs = 6;

		this.items = [];
		this.currJobs = 0;
		this.scheduled = false;

	}

	add( item, priority, callback ) {

		return new Promise( ( resolve, reject ) => {

			const prCallback = ( ...args ) => callback( ...args ).then( resolve ).catch( reject );
			const items = this.items;
			for ( let i = 0, l = items.length; i < l; i ++ ) {

				const thisItem = items[ i ];
				if ( thisItem.priority > priority ) {

					items.splice( i, 0, { priority, item, callback: prCallback } );
					this.scheduleJobRun();
					return;

				}

			}

			items.push( { priority, item, callback: prCallback } );
			this.scheduleJobRun();

		} );

	}

	remove( item ) {

		const items = this.items;
		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const thisItem = items[ i ];
			if ( thisItem.item === item ) {

				items.splice( i, 1 );
				break;

			}

		}

	}

	tryRunJobs() {

		const items = this.items;
		const maxJobs = this.maxJobs;
		while ( maxJobs > this.currJobs && items.length > 0 ) {

			this.currJobs ++;
			const { item, priority, callback } = items.pop();
			callback( item, priority )
				.then( () => {

					this.currJobs --;
					this.scheduleJobRun();

				} )
				.catch( () => {

					this.currJobs --;
					this.scheduleJobRun();

				} );

		}

	}

	scheduleJobRun() {

		if ( ! this.scheduled ) {

			Promise.resolve().then( () => {

				this.tryRunJobs();
				this.scheduled = false;

			} );
			this.scheduled = true;

		}

	}

}

export { PriorityQueue };
