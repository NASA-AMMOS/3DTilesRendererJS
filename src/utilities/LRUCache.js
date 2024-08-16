const GIGABYTE_BYTES = 2 ** 30;

class LRUCache {

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

		// options
		this.maxSize = 800;
		this.minSize = 600;
		this.minBytesSize = 0.2 * GIGABYTE_BYTES;
		this.maxBytesSize = 0.3 * GIGABYTE_BYTES;
		this.unloadPercent = 0.05;

		// "itemSet" doubles as both the list of the full set of items currently
		// stored in the cache (keys) as well as a map to the time the item was last
		// used so it can be sorted appropriately.
		this.itemSet = new Map();
		this.itemList = [];
		this.usedSet = new Set();
		this.callbacks = new Map();
		this.markUnusedQueued = false;
		this.unloadingHandle = - 1;
		this.cachedBytes = 0;
		this.bytesMap = new Map();

		this._unloadPriorityCallback = null;
		this.getMemoryUsageCallback = () => 0;

		const itemSet = this.itemSet;
		this.defaultPriorityCallback = item => itemSet.get( item );

	}

	// Returns whether or not the cache has reached the maximum size
	isFull() {

		return this.itemSet.size >= this.maxSize || this.cachedBytes >= this.maxBytesSize;

	}

	add( item, removeCb ) {

		if ( this.markUnusedQueued ) {

			this.markAllUnused();

		}

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
		const bytesMap = this.bytesMap;
		itemList.push( item );
		usedSet.add( item );
		itemSet.set( item, Date.now() );
		callbacks.set( item, removeCb );

		const bytes = this.getMemoryUsageCallback( item );
		this.cachedBytes += bytes;
		bytesMap.set( item, bytes );

		return true;

	}

	remove( item ) {

		const usedSet = this.usedSet;
		const itemSet = this.itemSet;
		const itemList = this.itemList;
		const bytesMap = this.bytesMap;
		const callbacks = this.callbacks;

		if ( itemSet.has( item ) ) {

			this.cachedBytes -= bytesMap.get( item );
			bytesMap.delete( item );

			callbacks.get( item )( item );

			const index = itemList.indexOf( item );
			itemList.splice( index, 1 );
			usedSet.delete( item );
			itemSet.delete( item );
			callbacks.delete( item );

			return true;

		}

		return false;

	}

	updateMemoryUsed( item ) {

		const itemSet = this.itemSet;
		const bytesMap = this.bytesMap;
		if ( ! itemSet.has( item ) ) {

			return;

		}

		this.cachedBytes -= bytesMap.get( item );

		const bytes = this.getMemoryUsageCallback( item );
		bytesMap.set( item, bytes );
		this.cachedBytes += bytes;

	}

	markUsed( item ) {

		if ( this.markUnusedQueued ) {

			this.markAllUnused();

		}

		const itemSet = this.itemSet;
		const usedSet = this.usedSet;
		if ( itemSet.has( item ) && ! usedSet.has( item ) ) {

			itemSet.set( item, Date.now() );
			usedSet.add( item );

		}

	}

	markAllUnused() {

		this.usedSet.clear();
		this.markUnusedQueued = false;
		if ( this.unloadingHandle !== - 1 ) {

			cancelAnimationFrame( this.unloadingHandle );
			this.unloadingHandle = - 1;

		}

	}

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
			callbacks,
			bytesMap,
			minBytesSize,
			maxBytesSize,
		} = this;

		const unused = itemList.length - usedSet.size;
		const excessNodes = Math.max( Math.min( itemList.length - minSize, unused ), 0 );
		const excessBytes = this.cachedBytes - minBytesSize;
		const unloadPriorityCallback = this.unloadPriorityCallback || this.defaultPriorityCallback;
		let remaining = excessNodes;

		const hasNodesToUnload = excessNodes > 0 && unused > 0 || itemList.length > maxSize;
		const hasBytesToUnload = unused && this.cachedBytes > minBytesSize || this.cachedBytes > maxBytesSize;
		if ( hasBytesToUnload || hasNodesToUnload ) {

			// used items should be at the end of the array
			itemList.sort( ( a, b ) => {

				const usedA = usedSet.has( a );
				const usedB = usedSet.has( b );
				if ( usedA && usedB ) {

					// If they're both used then don't bother moving them
					return 0;

				} else if ( ! usedA && ! usedB ) {

					// Use the sort function otherwise
					// higher priority should be further to the left
					return - unloadPriorityCallback( a, b );

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
			while (
				removedNodes < nodesToUnload ||
				removedBytes < bytesToUnload ||
				this.cachedBytes - removedBytes > maxBytesSize ||
				itemList.length - removedNodes > maxSize
			) {

				// don't unload any used tiles unless we're above our size cap
				if (
					removedNodes >= unused &&
					this.cachedBytes - removedBytes <= maxBytesSize &&
					itemList.length - removedNodes <= maxSize
				) {

					break;

				}

				const item = itemList[ removedNodes ];
				removedBytes += bytesMap.get( item );
				removedNodes ++;

				bytesMap.delete( item );
				callbacks.get( item )( item );
				itemSet.delete( item );
				callbacks.delete( item );


			}

			itemList.splice( 0, removedNodes );
			this.cachedBytes -= removedBytes;

			remaining = removedNodes < excessNodes || removedBytes < excessBytes;

		}

		if ( remaining ) {

			this.unloadingHandle = requestAnimationFrame( () => this.scheduleUnload() );

		}

	}

	scheduleUnload() {

		if ( ! this.scheduled ) {

			this.scheduled = true;
			queueMicrotask( () => {

				this.scheduled = false;
				this.unloadUnusedContent();
				this.markUnusedQueued = true;

			} );

		}

	}

}

export { LRUCache };
