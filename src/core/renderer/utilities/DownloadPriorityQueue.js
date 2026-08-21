/** @import { ItemCallback, PriorityCallback } from './PriorityQueue.js' */
import { PriorityQueue } from './PriorityQueue.js';
import { getUrlOrigin } from './urlExtension.js';

/**
 * Manages a lazily created PriorityQueue per server origin so the requests to every server are
 * prioritized and limited independently, and a slow or saturated server can never delay the
 * requests made to others. The items added without a url are managed as their own group.
 */
export class DownloadPriorityQueue {

	/**
	 * returns whether tasks are queued or actively running in any origin queue
	 * @readonly
	 * @type {boolean}
	 */
	get running() {

		for ( const queue of this.originQueues.values() ) {

			if ( queue.running ) {

				return true;

			}

		}

		return false;

	}

	/**
	 * Maximum number of requests that can run concurrently per server.
	 * @type {number}
	 * @default 6
	 */
	get maxJobsPerOrigin() {

		return this._maxJobsPerOrigin;

	}

	set maxJobsPerOrigin( v ) {

		this._maxJobsPerOrigin = v;
		this.originQueues.forEach( queue => queue.maxJobs = v );

	}

	/**
	 * Comparator used to sort the queued items of every origin queue.
	 * @type {PriorityCallback|null}
	 * @default null
	 */
	get priorityCallback() {

		return this._priorityCallback;

	}

	set priorityCallback( v ) {

		this._priorityCallback = v;
		this.originQueues.forEach( queue => queue.priorityCallback = v );

	}

	constructor() {

		this.originQueues = new Map();
		this._itemQueues = new WeakMap();
		this._maxJobsPerOrigin = 6;
		this._priorityCallback = null;

	}

	/**
	 * Adds an item to the queue of the url's server and returns a Promise that resolves when the
	 * item's callback completes, or rejects if the item is removed before running.
	 * @param {string|null} url - Url the item requests data from
	 * @param {any} item
	 * @param {ItemCallback} callback - Invoked with `item` when it is dequeued; may return a Promise
	 * @returns {Promise<any>}
	 */
	add( url, item, callback ) {

		// drop the queues for origins with no work left
		this.originQueues.forEach( ( queue, key ) => {

			if ( ! queue.running ) {

				this.originQueues.delete( key );

			}

		} );

		const origin = url === null ? null : getUrlOrigin( url );
		let queue = this.originQueues.get( origin );
		if ( ! queue ) {

			queue = new PriorityQueue();
			queue.maxJobs = this._maxJobsPerOrigin;
			queue.priorityCallback = this._priorityCallback;
			this.originQueues.set( origin, queue );

		}

		const existing = this._itemQueues.get( item );
		if ( existing && existing !== queue && existing.has( item ) ) {

			throw new Error( 'DownloadPriorityQueue: Item is already queued with a different url origin.' );

		}

		this._itemQueues.set( item, queue );
		return queue.add( item, callback );

	}

	/**
	 * Removes an item from its origin queue, rejecting its promise with an `AbortError` DOMException.
	 * @param {any} item
	 */
	remove( item ) {

		const queue = this._itemQueues.get( item );
		if ( queue ) {

			queue.remove( item );
			this._itemQueues.delete( item );

		}

	}

	/**
	 * Returns whether the given item is currently queued.
	 * @param {any} item
	 * @returns {boolean}
	 */
	has( item ) {

		const queue = this._itemQueues.get( item );
		return Boolean( queue && queue.has( item ) );

	}

}
