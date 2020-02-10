import { LRUCache } from '../src/LRUCache.js';

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
		cache.unloadUnusedContent( 0.25, null );
		expect( cache.isFull() ).toEqual( true );
		cache.markAllUnused();
		cache.unloadUnusedContent( 0.25, null );

		expect( cache.isFull() ).toEqual( false );

	} );

} );
