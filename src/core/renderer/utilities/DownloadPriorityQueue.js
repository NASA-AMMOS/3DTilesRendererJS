/** @import { ItemCallback } from './PriorityQueue.js' */
import { PriorityQueue } from './PriorityQueue.js';
import { getUrlOrigin } from './urlExtension.js';

/**
 * PriorityQueue for scheduling downloads that additionally limits the concurrent requests made to
 * any single server, so a slow server cannot occupy every slot and block the requests to others.
 */
export class DownloadPriorityQueue extends PriorityQueue {

	constructor() {

		super();

		/**
		 * Maximum number of requests that can run concurrently per server for the items added with
		 * a url, matching the concurrent connection limit browsers apply per origin.
		 * @type {number}
		 * @default 6
		 */
		this.maxJobsPerOrigin = 6;

		this.originJobs = new Map();

	}

	/**
	 * Adds an item to the queue, limiting the concurrent requests to the url's server.
	 * @param {any} item
	 * @param {ItemCallback} callback - Invoked with `item` when it is dequeued; may return a Promise
	 * @param {string|null} [url=null] - Url the item requests data from
	 * @returns {Promise<any>}
	 */
	add( item, callback, url = null ) {

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

		const { origin } = data;
		if ( origin === null || origin === undefined ) {

			return true;

		}

		return ( this.originJobs.get( origin ) || 0 ) < this.maxJobsPerOrigin;

	}

	_jobStarted( data ) {

		const { origin } = data;
		if ( origin !== null && origin !== undefined ) {

			this.originJobs.set( origin, ( this.originJobs.get( origin ) || 0 ) + 1 );

		}

	}

	_jobCompleted( data ) {

		const { origin } = data;
		if ( origin !== null && origin !== undefined ) {

			const count = this.originJobs.get( origin ) - 1;
			if ( count === 0 ) {

				this.originJobs.delete( origin );

			} else {

				this.originJobs.set( origin, count );

			}

		}

	}

}
