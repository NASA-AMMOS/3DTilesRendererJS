/** @import { ItemCallback } from './PriorityQueue.js' */
import { PriorityQueue } from './PriorityQueue.js';
import { getUrlOrigin } from './urlExtension.js';

/**
 * PriorityQueue for scheduling downloads that limits the concurrent requests per server rather
 * than in total, so a slow or saturated server can never delay the requests made to others. The
 * items added without a url are limited as their own group.
 */
export class DownloadPriorityQueue extends PriorityQueue {

	constructor() {

		super();

		this.maxJobs = Infinity;

		/**
		 * Maximum number of requests that can run concurrently per server.
		 * @type {number}
		 * @default 6
		 */
		this.maxJobsPerOrigin = 6;

		this.originJobs = new Map();

	}

	/**
	 * Adds an item to the queue, limiting the concurrent requests to the url's server.
	 * @param {string|null} url - Url the item requests data from
	 * @param {any} item
	 * @param {ItemCallback} callback - Invoked with `item` when it is dequeued; may return a Promise
	 * @returns {Promise<any>}
	 */
	add( url, item, callback ) {

		const origin = url === null ? null : getUrlOrigin( url );
		const existing = this.callbacks.get( item );
		if ( existing && existing.origin !== origin ) {

			throw new Error( 'DownloadPriorityQueue: Item is already queued with a different url origin.' );

		}

		const promise = super.add( item, callback );
		this.callbacks.get( item ).origin = origin;
		return promise;

	}

	_canRunJob( data ) {

		return ( this.originJobs.get( data.origin ) || 0 ) < this.maxJobsPerOrigin;

	}

	_jobStarted( data ) {

		const { origin } = data;
		this.originJobs.set( origin, ( this.originJobs.get( origin ) || 0 ) + 1 );

	}

	_jobCompleted( data ) {

		const { origin } = data;
		const count = this.originJobs.get( origin ) - 1;
		if ( count === 0 ) {

			this.originJobs.delete( origin );

		} else {

			this.originJobs.set( origin, count );

		}

	}

}
