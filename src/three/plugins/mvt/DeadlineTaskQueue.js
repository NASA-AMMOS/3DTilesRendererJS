// Queue of work amortized over multiple frames. Items are keyed, so one pushed again before it has
// been processed replaces the pending entry rather than queueing twice.
export class DeadlineTaskQueue {

	get hasPendingWork() {

		return this._queue.size > 0;

	}

	constructor() {

		/**
		 * Called with each item as it comes off the queue.
		 * @type {Function}
		 */
		this.callback = () => {};

		this.maxUpdateTimeMs = 1;

		this._queue = new Map();

	}

	add( key, item ) {

		this._queue.set( key, item );

	}

	delete( key ) {

		this._queue.delete( key );

	}

	// an item is never interrupted, so one always runs
	update( ms = this.maxUpdateTimeMs ) {

		const { _queue, callback } = this;
		const deadline = performance.now() + ms;

		for ( const [ key, item ] of _queue ) {

			_queue.delete( key );
			callback( item );

			if ( performance.now() >= deadline ) {

				break;

			}

		}

	}

	clear() {

		this._queue.clear();

	}

}
