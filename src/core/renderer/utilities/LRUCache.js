import { FrameScheduler } from './FrameScheduler.js';

const GIGABYTE_BYTES = 2 ** 30;

/**
 * @callback UnloadPriorityCallback
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */

/**
 * @callback RemoveCallback
 * @param {any} item
 */

/**
 * Least-recently-used cache for managing tile content lifecycle. Tracks which items
 * are in use each frame and evicts unused items when the cache exceeds its size limits.
 */
class LRUCache {

	/**
	 * Comparator used to determine eviction order. Items that sort last are evicted first.
	 * Defaults to `null` (eviction order is by last-used time).
	 * @type {UnloadPriorityCallback|null}
	 */
	get unloadPriorityCallback() {

		return this._unloadPriorityCallback;

	}

	set unloadPriorityCallback( cb ) {

		if ( cb.length === 1 ) {

			console.warn( 'LRUCache: "unloadPriorityCallback" function has been changed to take two arguments.' );
			this._unloadPriorityCallback = ( a, b ) => {

				const valA = cb( a );
				const valB = cb( b );

				if ( valA < valB ) return - 1;
				if ( valA > valB ) return 1;
				return 0;

			};

		} else {

			this._unloadPriorityCallback = cb;

		}

	}

	constructor() {

		/**
		 * Minimum number of items to keep in the cache after eviction.
		 * @type {number}
		 */
		this.minSize = 6000;

		/**
		 * Maximum number of items before eviction is triggered.
		 * @type {number}
		 */
		this.maxSize = 8000;

		/**
		 * Minimum total bytes to retain after eviction.
		 * @note Only works with three.js r166 or higher.
		 * @type {number}
		 */
		this.minBytesSize = 0.3 * GIGABYTE_BYTES;

		/**
		 * Maximum total bytes before eviction is triggered.
		 * @note Only works with three.js r166 or higher.
		 * @type {number}
		 */
		this.maxBytesSize = 0.4 * GIGABYTE_BYTES;

		/**
		 * Fraction of excess items/bytes to unload per eviction pass.
		 * @type {number}
		 */
		this.unloadPercent = 0.05;

		/**
		 * If true, items are automatically marked as unused at the start of each eviction pass.
		 * @type {boolean}
		 */
		this.autoMarkUnused = true;

		// "itemSet" doubles as both the list of the full set of items currently
		// stored in the cache (keys) as well as a map to the time the item was last
		// used so it can be sorted appropriately.
		this.itemSet = new Map();
		this.itemList = [];
		this.usedSet = new Set();
		this.callbacks = new Map();
		this.unloadingHandle = - 1;
		this.cachedBytes = 0;
		this.bytesMap = new Map();
		this.loadedSet = new Set();

		this._unloadPriorityCallback = null;

		this.frameScheduler = new FrameScheduler();

		const itemSet = this.itemSet;
		this.defaultPriorityCallback = item => itemSet.get( item );

	}

	/**
	 * Returns whether the cache has reached its maximum item count or byte size.
	 * @returns {boolean}
	 */
	isFull() {

		return this.itemSet.size >= this.maxSize || this.cachedBytes >= this.maxBytesSize;

	}

	/**
	 * Returns the byte size registered for the given item, or 0 if not tracked.
	 * @param {any} item
	 * @returns {number}
	 */
	getMemoryUsage( item ) {

		return this.bytesMap.get( item ) || 0;

	}

	/**
	 * Sets the byte size for the given item, updating the total `cachedBytes` count.
	 * @param {any} item
	 * @param {number} bytes
	 */
	setMemoryUsage( item, bytes ) {

		const { bytesMap, itemSet } = this;
		if ( ! itemSet.has( item ) ) {

			return;

		}

		this.cachedBytes -= bytesMap.get( item ) || 0;
		bytesMap.set( item, bytes );
		this.cachedBytes += bytes;

	}

	/**
	 * Adds an item to the cache. Returns false if the item already exists or the cache is full.
	 * @param {any} item
	 * @param {RemoveCallback} removeCb - Called with the item when it is evicted
	 * @returns {boolean}
	 */
	add( item, removeCb ) {

		const itemSet = this.itemSet;
		if ( itemSet.has( item ) ) {

			return false;

		}

		if ( this.isFull() ) {

			return false;

		}

		const usedSet = this.usedSet;
		const itemList = this.itemList;
		const callbacks = this.callbacks;
		itemList.push( item );
		usedSet.add( item );
		itemSet.set( item, Date.now() );
		callbacks.set( item, removeCb );

		return true;

	}

	/**
	 * Returns whether the given item is in the cache.
	 * @param {any} item
	 * @returns {boolean}
	 */
	has( item ) {

		return this.itemSet.has( item );

	}

	/**
	 * Removes an item from the cache immediately, invoking its removal callback.
	 * Returns false if the item was not in the cache.
	 * @param {any} item
	 * @returns {boolean}
	 */
	remove( item ) {

		const usedSet = this.usedSet;
		const itemSet = this.itemSet;
		const itemList = this.itemList;
		const bytesMap = this.bytesMap;
		const callbacks = this.callbacks;
		const loadedSet = this.loadedSet;

		if ( itemSet.has( item ) ) {

			this.cachedBytes -= bytesMap.get( item ) || 0;
			bytesMap.delete( item );

			callbacks.get( item )( item );

			const index = itemList.indexOf( item );
			itemList.splice( index, 1 );
			usedSet.delete( item );
			itemSet.delete( item );
			callbacks.delete( item );
			loadedSet.delete( item );

			return true;

		}

		return false;

	}

	/**
	 * Marks whether an item has finished loading. Unloaded items may be evicted early
	 * when the cache is over its max size limits, even if they are marked as used.
	 * @param {any} item
	 * @param {boolean} value
	 */
	setLoaded( item, value ) {

		const { itemSet, loadedSet } = this;
		if ( itemSet.has( item ) ) {

			if ( value === true ) {

				loadedSet.add( item );

			} else {

				loadedSet.delete( item );

			}

		}

	}

	/**
	 * Marks an item as used in the current frame, preventing it from being evicted.
	 * @param {any} item
	 */
	markUsed( item ) {

		const itemSet = this.itemSet;
		const usedSet = this.usedSet;
		if ( itemSet.has( item ) && ! usedSet.has( item ) ) {

			itemSet.set( item, Date.now() );
			usedSet.add( item );

		}

	}

	/**
	 * Marks an item as unused, making it eligible for eviction.
	 * @param {any} item
	 */
	markUnused( item ) {

		this.usedSet.delete( item );

	}

	/**
	 * Marks all items in the cache as unused.
	 */
	markAllUnused() {

		this.usedSet.clear();

	}

	/**
	 * Returns whether the given item is currently marked as used.
	 * @param {any} item
	 * @returns {boolean}
	 */
	isUsed( item ) {

		return this.usedSet.has( item );

	}

	/**
	 * Evicts unused items until the cache is within its min size and byte limits.
	 * Items are sorted by `unloadPriorityCallback` before eviction.
	 */
	// TODO: this should be renamed because it's not necessarily unloading all unused content
	// Maybe call it "cleanup" or "unloadToMinSize"
	unloadUnusedContent() {

		const {
			unloadPercent,
			minSize,
			maxSize,
			itemList,
			itemSet,
			usedSet,
			loadedSet,
			callbacks,
			bytesMap,
			minBytesSize,
			maxBytesSize,
		} = this;

		const unused = itemList.length - usedSet.size;
		const unloaded = itemList.length - loadedSet.size;
		const excessNodes = Math.max( Math.min( itemList.length - minSize, unused ), 0 );
		const excessBytes = this.cachedBytes - minBytesSize;
		const unloadPriorityCallback = this.unloadPriorityCallback || this.defaultPriorityCallback;
		let needsRerun = false;

		const hasNodesToUnload = excessNodes > 0 && unused > 0 || unloaded && itemList.length > maxSize;
		const hasBytesToUnload = unused && this.cachedBytes > minBytesSize || unloaded && this.cachedBytes > maxBytesSize;
		if ( hasBytesToUnload || hasNodesToUnload ) {

			// used items should be at the end of the array, "unloaded" items in the middle of the array
			itemList.sort( ( a, b ) => {

				const usedA = usedSet.has( a );
				const usedB = usedSet.has( b );
				if ( usedA === usedB ) {

					const loadedA = loadedSet.has( a );
					const loadedB = loadedSet.has( b );
					if ( loadedA === loadedB ) {

						// Use the sort function otherwise
						// higher priority should be further to the left
						return - unloadPriorityCallback( a, b );

					} else {

						return loadedA ? 1 : - 1;

					}

				} else {

					// If one is used and the other is not move the used one towards the end of the array
					return usedA ? 1 : - 1;

				}

			} );

			// address corner cases where the minSize might be zero or smaller than maxSize - minSize,
			// which would result in a very small or no items being unloaded.
			const maxUnload = Math.max( minSize * unloadPercent, excessNodes * unloadPercent );
			const nodesToUnload = Math.ceil( Math.min( maxUnload, unused, excessNodes ) );
			const maxBytesUnload = Math.max( unloadPercent * excessBytes, unloadPercent * minBytesSize );
			const bytesToUnload = Math.min( maxBytesUnload, excessBytes );

			let removedNodes = 0;
			let removedBytes = 0;

			// evict up to the max node or bytes size, keeping one more item over the max bytes limit
			// so the "full" function behaves correctly.
			while (
				this.cachedBytes - removedBytes > maxBytesSize ||
				itemList.length - removedNodes > maxSize
			) {

				const item = itemList[ removedNodes ];
				const bytes = bytesMap.get( item ) || 0;
				if (
					usedSet.has( item ) && loadedSet.has( item ) ||
					this.cachedBytes - removedBytes - bytes < maxBytesSize &&
					itemList.length - removedNodes <= maxSize
				) {

					break;

				}

				removedBytes += bytes;
				removedNodes ++;

			}

			// evict up to the min node or bytes size, keeping one more item over the min bytes limit
			// so we're meeting it
			while (
				removedBytes < bytesToUnload ||
				removedNodes < nodesToUnload
			) {

				const item = itemList[ removedNodes ];
				const bytes = bytesMap.get( item ) || 0;
				if (
					usedSet.has( item ) ||
					this.cachedBytes - removedBytes - bytes < minBytesSize &&
					removedNodes >= nodesToUnload
				) {

					break;

				}

				removedBytes += bytes;
				removedNodes ++;

			}

			// remove the nodes
			itemList.splice( 0, removedNodes ).forEach( item => {

				this.cachedBytes -= bytesMap.get( item ) || 0;

				callbacks.get( item )( item );
				bytesMap.delete( item );
				itemSet.delete( item );
				callbacks.delete( item );
				loadedSet.delete( item );
				usedSet.delete( item );

			} );

			// if we didn't remove enough nodes or we still have excess bytes and there are nodes to removed
			// then we want to fire another round of unloading
			needsRerun = removedNodes < excessNodes || removedBytes < excessBytes && removedNodes < unused;
			needsRerun = needsRerun && removedNodes > 0;

		}

		if ( needsRerun ) {

			this.unloadingHandle = this.frameScheduler.requestAnimationFrame( () => this.scheduleUnload() );

		}

	}

	/**
	 * Schedules `unloadUnusedContent` to run asynchronously via microtask.
	 */
	scheduleUnload() {

		this.frameScheduler.cancelAnimationFrame( this.unloadingHandle );

		if ( ! this.scheduled ) {

			this.scheduled = true;
			queueMicrotask( () => {

				this.scheduled = false;
				this.unloadUnusedContent();

			} );

		}

	}

}

export { LRUCache };
