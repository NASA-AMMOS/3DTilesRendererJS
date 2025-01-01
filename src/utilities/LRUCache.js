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
		this.minSize = 6000;
		this.maxSize = 8000;
		this.minBytesSize = 0.3 * GIGABYTE_BYTES;
		this.maxBytesSize = 0.4 * GIGABYTE_BYTES;
		this.unloadPercent = 0.05;
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
		this.computeMemoryUsageCallback = () => null;

		const itemSet = this.itemSet;
		this.defaultPriorityCallback = item => itemSet.get( item );

	}

	// Returns whether or not the cache has reached the maximum size
	isFull() {

		return this.itemSet.size >= this.maxSize || this.cachedBytes >= this.maxBytesSize;

	}

	getMemoryUsage( item ) {

		return this.bytesMap.get( item ) ?? null;

	}

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
		const bytesMap = this.bytesMap;
		itemList.push( item );
		usedSet.add( item );
		itemSet.set( item, Date.now() );
		callbacks.set( item, removeCb );

		// computeMemoryUsageCallback can return "null" if memory usage is not known, yet
		const bytes = this.computeMemoryUsageCallback( item );
		this.cachedBytes += bytes || 0;
		bytesMap.set( item, bytes );

		return true;

	}

	has( item ) {

		return this.itemSet.has( item );

	}

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

	// Marks whether tiles in the cache have been completely loaded or not. Tiles that have not been completely
	// loaded are subject to being disposed early if the cache is full above its max size limits, even if they
	// are marked as used.
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

	updateMemoryUsage( item ) {

		const itemSet = this.itemSet;
		const bytesMap = this.bytesMap;
		if ( ! itemSet.has( item ) ) {

			return;

		}

		this.cachedBytes -= bytesMap.get( item ) || 0;

		const bytes = this.computeMemoryUsageCallback( item );
		bytesMap.set( item, bytes );
		this.cachedBytes += bytes;

	}

	markUsed( item ) {

		const itemSet = this.itemSet;
		const usedSet = this.usedSet;
		if ( itemSet.has( item ) && ! usedSet.has( item ) ) {

			itemSet.set( item, Date.now() );
			usedSet.add( item );

		}

	}

	markUnused( item ) {

		this.usedSet.delete( item );

	}

	markAllUnused() {

		this.usedSet.clear();

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

			this.unloadingHandle = requestAnimationFrame( () => this.scheduleUnload() );

		}

	}

	scheduleUnload() {

		cancelAnimationFrame( this.unloadingHandle );

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
