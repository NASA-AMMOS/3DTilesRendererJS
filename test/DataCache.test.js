import { DataCache } from '../src/three/plugins/images/utils/DataCache.js';

function waitFrame() {

	return new Promise( resolve => setTimeout( resolve ) );

}

describe( 'Sync DataCache', () => {

	it( 'should allow for setting and retrieving sync data by key.', async () => {

		const cache = new DataCache();
		cache.fetchItem = () => ( {} );

		expect( cache.has( 1, 2, 3 ) ).toBe( false );
		expect( cache.get( 1, 2, 3 ) ).toBe( null );

		cache.lock( 1, 2, 3 );
		expect( cache.has( 1, 2, 3 ) ).toBe( true );
		expect( cache.get( 1, 2, 3 ) ).toEqual( {} );

		cache.release( 1, 2, 3 );

		await waitFrame();

		expect( cache.has( 1, 2, 3 ) ).toBe( false );
		expect( cache.get( 1, 2, 3 ) ).toBe( null );

	} );

	it( 'should require the same amount of releases as locks.', async () => {

		const cache = new DataCache();
		cache.fetchItem = () => ( {} );

		cache.lock( 1, 2, 3 );
		cache.lock( 1, 2, 3 );
		expect( cache.has( 1, 2, 3 ) ).toBe( true );
		expect( cache.get( 1, 2, 3 ) ).toEqual( {} );

		cache.release( 1, 2, 3 );

		await waitFrame();

		expect( cache.has( 1, 2, 3 ) ).toBe( true );
		expect( cache.get( 1, 2, 3 ) ).toEqual( {} );

		cache.release( 1, 2, 3 );

		await waitFrame();

		expect( cache.has( 1, 2, 3 ) ).toBe( false );
		expect( cache.get( 1, 2, 3 ) ).toEqual( null );

	} );

	it( 'should throw an error if releasing an item that cannot be.', async () => {

		const cache = new DataCache();
		cache.fetchItem = () => ( {} );

		let thrown = false;
		try {

			cache.release( 1, 2, 3 );

		} catch {

			thrown = true;

		}

		expect( thrown ).toBe( true );

		cache.lock( 1, 2, 3 );
		cache.release( 1, 2, 3 );

		thrown = false;
		try {

			cache.release( 1, 2, 3 );
			cache.release( 1, 2, 3 );
			cache.release( 1, 2, 3 );
			cache.release( 1, 2, 3 );

		} catch {

			thrown = true;

		}

		expect( thrown ).toBe( true );

	} );

	it( 'should allow for setting data directly.', async () => {

		const cache = new DataCache();
		cache.setData( 1, 2, 3, {} );

		expect( cache.has( 1, 2, 3 ) ).toBe( true );
		expect( cache.get( 1, 2, 3 ) ).toEqual( {} );

		cache.lock( 1, 2, 3 );
		cache.release( 1, 2, 3 );
		cache.release( 1, 2, 3 );

		await waitFrame();

		expect( cache.has( 1, 2, 3 ) ).toBe( false );

	} );

	it( 'should allow for a frame between full disposal.', async () => {

		const cache = new DataCache();
		let index = 0;
		cache.fetchItem = () => ( { index: index ++ } );

		cache.lock( 1, 2, 3 );
		expect( cache.get( 1, 2, 3 ) ).toEqual( { index: 0 } );

		cache.release( 1, 2, 3 );
		cache.lock( 1, 2, 3 );

		await waitFrame();
		expect( cache.get( 1, 2, 3 ) ).toEqual( { index: 0 } );

		// waiting a frame should result in disposal
		cache.release( 1, 2, 3 );
		await waitFrame();
		expect( cache.get( 1, 2, 3 ) ).toEqual( null );

		cache.lock( 1, 2, 3 );
		expect( cache.get( 1, 2, 3 ) ).toEqual( { index: 1 } );

	} );

	it( 'should return null when an object is released even if it has not been fulled disposed yet.', () => {

		const cache = new DataCache();
		cache.fetchItem = () => ( {} );

		cache.lock( 1, 2, 3 );
		cache.release( 1, 2, 3 );
		expect( cache.get( 1, 2, 3 ) ).toEqual( null );

		cache.lock( 1, 2, 3 );
		expect( cache.get( 1, 2, 3 ) ).toEqual( {} );

	} );

	it( 'should dispose of all objects on dispose().', () => {

		const cache = new DataCache();
		cache.fetchItem = () => ( {} );

		cache.lock( 1, 2, 3 );
		cache.lock( 1, 2, 3 );
		cache.lock( 1, 2, 3 );
		expect( cache.get( 1, 2, 3 ) ).toEqual( {} );

		cache.dispose();
		expect( cache.get( 1, 2, 3 ) ).toEqual( null );

	} );

	it( 'should track memory usage.', async () => {

		const cache = new DataCache();
		cache.fetchItem = () => ( {} );
		cache.getMemoryUsage = () => 0.1;

		cache.lock( 1, 2, 3 );
		cache.lock( 1, 2, 3 );
		cache.lock( 1, 2, 3 );
		expect( cache.cachedBytes ).toEqual( 0.1 );

		cache.lock( 1 );
		expect( cache.cachedBytes ).toEqual( 0.2 );

		cache.release( 1 );
		await waitFrame();
		expect( cache.cachedBytes ).toEqual( 0.1 );

	} );

	it( 'should call "disposeItem" on disposed objects.', async () => {

		let disposeCall = 0;
		const cache = new DataCache();
		cache.fetchItem = () => ( {} );
		cache.disposeItem = item => {

			expect( item ).toEqual( {} );
			disposeCall ++;

		};

		cache.lock( 1, 2, 3 );
		cache.release( 1, 2, 3 );
		expect( disposeCall ).toBe( 0 );

		await waitFrame();
		expect( disposeCall ).toBe( 1 );

	} );

} );

describe( 'Async DataCache', () => {

	it( 'should call dispose even if release is called before load is complete.', async () => {

		let disposeCall = 0;
		const cache = new DataCache();
		cache.fetchItem = async () => ( {} );
		cache.disposeItem = () => disposeCall ++;

		cache.lock( 1 );
		expect( cache.get( 1 ) instanceof Promise ).toEqual( true );

		cache.release( 1 );
		expect( cache.get( 1 ) ).toEqual( null );

		await waitFrame();

		expect( disposeCall ).toBe( 1 );

	} );

	it( 'should tally memory only after load.', async () => {

		const cache = new DataCache();
		cache.fetchItem = async () => ( {} );
		cache.getMemoryUsage = () => 0.1;

		cache.lock( 1 );
		expect( cache.get( 1 ) instanceof Promise ).toEqual( true );
		expect( cache.cachedBytes ).toEqual( 0 );

		await waitFrame();
		expect( cache.get( 1 ) ).toEqual( {} );
		expect( cache.cachedBytes ).toEqual( 0.1 );

	} );

} );
