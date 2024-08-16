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
		cache.unloadUnusedContent( null );
		expect( cache.isFull() ).toEqual( true );
		cache.markAllUnused();
		cache.unloadUnusedContent( null );

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
		cache.getMemoryUsageCallback = () => 4;

		for ( let i = 0; i < 10; i ++ ) {

			const item = { priority: 1 };
			cache.add( item, () => {} );

		}

		expect( cache.itemList.length ).toEqual( 6 );
		expect( cache.cachedBytes ).toEqual( 24 );

		cache.markAllUnused();
		cache.unloadUnusedContent();
		expect( cache.itemList.length ).toEqual( 1 );
		expect( cache.cachedBytes ).toEqual( 4 );

	} );

} );
