import { LRUCache } from '../src/utilities/LRUCache.js';

globalThis.requestAnimationFrame = setTimeout;
globalThis.cancelAnimationFrame = clearTimeout;

describe( 'LRUCache', () => {

	it( 'should not allow the same object to be added more than once.', () => {

		const cache = new LRUCache();
		const A = {};

		expect( cache.add( A, () => {} ) ).toEqual( true );
		expect( cache.add( A, () => {} ) ).toEqual( false );
		expect( cache.remove( A ) ).toEqual( true );
		expect( cache.remove( A ) ).toEqual( false );

	} );

	it( 'should not allow adding if the cache is full.', () => {

		const cache = new LRUCache();
		cache.minSize = cache.maxSize = 1;

		expect( cache.isFull() ).toEqual( false );

		cache.add( {}, () => {} );
		expect( cache.add( {}, () => {} ) ).toEqual( false );
		expect( cache.isFull() ).toEqual( true );

	} );

	it( 'should fire the callback when removing an item.', () => {

		const cache = new LRUCache();
		const A = {};
		let called = false;
		cache.add( A, () => called = true );

		expect( called ).toEqual( false );
		cache.remove( A );
		expect( called ).toEqual( true );

	} );

	it( 'should mark an item as used when adding.', () => {

		const cache = new LRUCache();
		cache.minSize = 0;
		cache.maxSize = 1;

		cache.add( {}, () => {} );

		expect( cache.isFull() ).toEqual( true );
		cache.unloadUnusedContent();
		expect( cache.isFull() ).toEqual( true );
		cache.markAllUnused();
		cache.unloadUnusedContent();

		expect( cache.isFull() ).toEqual( false );

	} );

	it( 'should sort before unloading', () => {

		const cache = new LRUCache();
		cache.unloadPriorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;
		cache.minSize = 0;
		cache.maxSize = 10;
		cache.unloadPercent = 1;

		const arr = [];
		const unloadCallback = item => {

			arr.push( item.priority );

		};

		const P1 = { priority: 1 };
		const P2 = { priority: 2 };
		const P3 = { priority: 3 };
		const P4 = { priority: 4 };

		cache.add( P1, unloadCallback );
		cache.add( P2, unloadCallback );
		cache.add( P3, unloadCallback );
		cache.add( P4, unloadCallback );

		cache.markAllUnused();
		cache.markUsed( P2 );
		cache.markUsed( P3 );

		cache.unloadUnusedContent();
		expect( arr ).toEqual( [ 4, 1 ] );

	} );

	it( 'should evict items if they are the max item length even if they are used.', () => {

		const cache = new LRUCache();
		cache.unloadPriorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;
		cache.minSize = 0;
		cache.maxSize = 10;

		for ( let i = 0; i < 10; i ++ ) {

			const item = { priority: 1 };
			cache.add( item, () => {} );
			cache.markUsed( item );

		}

		expect( cache.itemList.length ).toEqual( 10 );

		cache.maxSize = 3;
		cache.unloadUnusedContent();
		expect( cache.itemList.length ).toEqual( 3 );

	} );

	it( 'should limit the amount of bytes allowed in the cache.', () => {

		const cache = new LRUCache();
		cache.minBytesSize = 5;
		cache.maxBytesSize = 25;
		cache.unloadPercent = 1;
		cache.computeMemoryUsageCallback = () => 4;

		for ( let i = 0; i < 10; i ++ ) {

			const item = { priority: 1 };
			cache.add( item, () => {} );

		}

		expect( cache.itemList.length ).toEqual( 7 );
		expect( cache.cachedBytes ).toEqual( 28 );

		cache.markAllUnused();
		cache.unloadUnusedContent();
		expect( cache.itemList.length ).toEqual( 2 );
		expect( cache.cachedBytes ).toEqual( 8 );

	} );

	it( 'should update memory usage when the items are triggers.', () => {

		const cache = new LRUCache();
		cache.minBytesSize = 10;
		cache.maxBytesSize = 25;
		cache.unloadPercent = 1;
		cache.computeMemoryUsageCallback = () => 1;

		const items = new Array( 10 ).fill().map( () => ( { priority: 1 } ) );
		for ( let i = 0; i < 10; i ++ ) {

			cache.add( items[ i ], () => {} );

		}

		expect( cache.cachedBytes ).toEqual( 10 );
		expect( cache.itemList.length ).toEqual( 10 );

		cache.unloadUnusedContent();
		expect( cache.cachedBytes ).toEqual( 10 );
		expect( cache.itemList.length ).toEqual( 10 );

		cache.computeMemoryUsageCallback = () => 4;
		for ( let i = 0; i < 10; i ++ ) {

			cache.updateMemoryUsage( items[ i ] );

		}

		expect( cache.cachedBytes ).toEqual( 40 );
		expect( cache.itemList.length ).toEqual( 10 );

		cache.unloadUnusedContent();
		expect( cache.cachedBytes ).toEqual( 28 );
		expect( cache.itemList.length ).toEqual( 7 );

	} );

	it( 'should allow for unloading "used" items if they are unloaded and above the max bytes size threshold.', () => {

		const cache = new LRUCache();
		cache.minBytesSize = 0;
		cache.maxBytesSize = 5;
		cache.unloadPercent = 1;
		cache.computeMemoryUsageCallback = () => null;

		// insert items with unknown memory quantity
		const items = new Array( 10 ).fill().map( () => ( { priority: 1 } ) );
		for ( let i = 0; i < 10; i ++ ) {

			cache.add( items[ i ], () => {} );

		}

		expect( cache.isFull() ).toEqual( false );

		// update all items to have a memory quantity that's over the cache limit and update the items
		cache.computeMemoryUsageCallback = () => 1;
		cache.itemList.forEach( item => cache.updateMemoryUsage( item ) );

		expect( cache.isFull() ).toEqual( true );
		expect( cache.itemList.length ).toEqual( 10 );

		cache.unloadUnusedContent();
		expect( cache.isFull() ).toEqual( true );
		expect( cache.itemList.length ).toEqual( 5 );

	} );

	it( 'should not unload "used" items if they are loaded and above the max bytes size threshold.', () => {

		const cache = new LRUCache();
		cache.minBytesSize = 0;
		cache.maxBytesSize = 5;
		cache.unloadPercent = 1;
		cache.computeMemoryUsageCallback = () => null;

		// insert items with unknown memory quantity
		const items = new Array( 10 ).fill().map( () => ( { priority: 1 } ) );
		for ( let i = 0; i < 10; i ++ ) {

			cache.add( items[ i ], () => {} );

		}

		expect( cache.isFull() ).toEqual( false );

		// update all items to have a memory quantity that's over the cache limit and update the items
		cache.computeMemoryUsageCallback = () => 1;
		cache.itemList.forEach( item => {

			cache.updateMemoryUsage( item );
			cache.setLoaded( item, true );

		} );

		expect( cache.isFull() ).toEqual( true );
		expect( cache.itemList.length ).toEqual( 10 );

		cache.unloadUnusedContent();
		expect( cache.isFull() ).toEqual( true );
		expect( cache.itemList.length ).toEqual( 10 );

	} );

} );
