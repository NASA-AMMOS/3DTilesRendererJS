// TODO: can we remove the use of `indexOf` here because it's potentially slow? Possibly use time and sort as needed?
class LRUCache {

	constructor() {

		// options
		this.maxSize = 800;
		this.minSize = 600;
		this.unloadPercent = 0.2;

		this.usedSet = new Set();
		this.itemSet = new Set();
		this.itemList = [];
		this.callbacks = new Map();

	}

	// Returns whether or not the cache has reached the maximum size
	isFull() {

		return this.itemSet.size >= this.maxSize;

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
		itemList.push( item );
		usedSet.add( item );
		itemSet.add( item );
		callbacks.set( item, removeCb );

		return true;

	}

	remove( item ) {

		const usedSet = this.usedSet;
		const itemSet = this.itemSet;
		const itemList = this.itemList;
		const callbacks = this.callbacks;

		if ( itemSet.has( item ) ) {

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

	markUsed( item ) {

		const itemSet = this.itemSet;
		const usedSet = this.usedSet;
		if ( itemSet.has( item ) && ! usedSet.has( item ) ) {

			const itemList = this.itemList;
			const index = itemList.indexOf( item );
			itemList.splice( index, 1 );
			itemList.push( item );
			usedSet.add( item );

		}

	}

	markAllUnused() {

		this.usedSet.clear();

	}

	// TODO: this should be renamed because it's not necessarily unloading all unused content
	// Maybe call it "cleanup" or "unloadToMinSize"
	unloadUnusedContent( prioritySortCb ) {

		const unloadPercent = this.unloadPercent;
		const targetSize = this.minSize;
		const itemList = this.itemList;
		const itemSet = this.itemSet;
		const usedSet = this.usedSet;
		const callbacks = this.callbacks;
		const unused = itemList.length - usedSet.size;

		if ( itemList.length > targetSize && unused > 0 ) {

			// TODO: sort by priority

			let nodesToUnload = Math.max( itemList.length - targetSize, targetSize ) * unloadPercent;
			nodesToUnload = Math.ceil( nodesToUnload );
			nodesToUnload = Math.min( unused, nodesToUnload );

			const removedItems = itemList.splice( 0, nodesToUnload );
			for ( let i = 0, l = removedItems.length; i < l; i ++ ) {

				const item = removedItems[ i ];
				callbacks.get( item )( item );
				itemSet.delete( item );
				callbacks.delete( item );

			}


		}

	}

	scheduleUnload( prioritySortCb, markAllUnused = true ) {

		if ( ! this.scheduled ) {

			this.scheduled = true;
			Promise.resolve().then( () => {

				this.scheduled = false;
				this.unloadUnusedContent( prioritySortCb );
				if ( markAllUnused ) {

					this.markAllUnused();

				}

			} );

		}

	}

}

export { LRUCache };
