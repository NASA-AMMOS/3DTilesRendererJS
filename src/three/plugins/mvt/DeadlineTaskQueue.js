// Queue of work amortized over multiple frames. Items are keyed, so one pushed again before it has
// been processed replaces the pending entry rather than queueing twice.
export class DeadlineTaskQueue {

	get hasPendingWork() {

		return this._queue.size > 0;

	}

	constructor() {

		/**
		 * Generator function called with each item as it comes off the queue and a function
		 * reporting whether the time budget is spent, so it can yield to pause until the
		 * next update.
		 * @type {Function}
		 */
		this.callback = function* () {};

		this.maxUpdateTimeMs = 1;

		this._queue = new Map();

		// key -> in-flight iterator for items paused mid-callback
		this._tasks = new Map();
		this._deadline = 0;
		this._isDeadlineComplete = () => performance.now() >= this._deadline;

	}

	add( key, item ) {

		// drop any in-flight task so the new item is processed from the start
		this._tasks.delete( key );
		this._queue.set( key, item );

	}

	delete( key ) {

		this._queue.delete( key );
		this._tasks.delete( key );

	}

	// a task step is never interrupted, so one always runs
	update( ms = this.maxUpdateTimeMs ) {

		const { _queue, _tasks, _isDeadlineComplete } = this;
		this._deadline = performance.now() + ms;

		for ( const [ key, item ] of _queue ) {

			// resume the in-flight task or start a new one
			let task = _tasks.get( key );
			if ( ! task ) {

				task = this.callback( item, _isDeadlineComplete );
				_tasks.set( key, task );

			}

			if ( task.next().done ) {

				_queue.delete( key );
				_tasks.delete( key );

			}

			if ( _isDeadlineComplete() ) {

				break;

			}

		}

	}

	clear() {

		this._queue.clear();
		this._tasks.clear();

	}

}
