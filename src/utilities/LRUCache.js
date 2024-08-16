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
		this.minBytesSize = 1000;
		this.maxBytesSize = 5000;
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
		this.currBytes = 0;
		this.bytesMap = new Map();

		this._unloadPriorityCallback = null;
		this.getMemoryUsageCallback = () => 0;

		const itemSet = this.itemSet;
		this.defaultPriorityCallback = item => itemSet.get( item );

	}

	// Returns whether or not the cache has reached the maximum size
	isFull() {

		return this.itemSet.size >= this.maxSize;

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
		this.currBytes += bytes;
		bytesMap.add( item, bytes );

		return true;

	}

	remove( item ) {

		const usedSet = this.usedSet;
		const itemSet = this.itemSet;
		const itemList = this.itemList;
		const bytesMap = this.bytesMap;
		const callbacks = this.callbacks;

		if ( itemSet.has( item ) ) {

			this.currBytes -= bytesMap.get( item );
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

		this.currBytes -= bytesMap.get( item );

		const bytes = this.getMemoryUsageCallback( item );
		bytesMap.set( item, bytes );
		this.currBytes += bytes;

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

		const unloadPercent = this.unloadPercent;
		const targetSize = this.minSize;
		const itemList = this.itemList;
		const itemSet = this.itemSet;
		const usedSet = this.usedSet;
		const callbacks = this.callbacks;
		const unused = itemList.length - usedSet.size;
		const excess = itemList.length - targetSize;
		const unloadPriorityCallback = this.unloadPriorityCallback || this.defaultPriorityCallback;
		let remaining = excess;

		if ( excess > 0 && unused > 0 ) {

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
			const unusedExcess = Math.min( excess, unused );
			const maxUnload = Math.max( targetSize * unloadPercent, unusedExcess * unloadPercent );
			let nodesToUnload = Math.min( maxUnload, unused );
			nodesToUnload = Math.ceil( nodesToUnload );
			remaining = excess - nodesToUnload;

			const removedItems = itemList.splice( 0, nodesToUnload );
			let removedBytes = 0;
			for ( let i = 0, l = removedItems.length; i < l; i ++ ) {

				const item = removedItems[ i ];
				removedBytes -= bytesMap.get( item );
				bytesMap.delete( item );
				callbacks.get( item )( item );
				itemSet.delete( item );
				callbacks.delete( item );

			}

			this.currBytes -= removedBytes;

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
