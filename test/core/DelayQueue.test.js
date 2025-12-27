import { DelayQueue } from '../../src/core/renderer/utilities/DelayQueue.js';

const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );

describe( 'DelayQueue', () => {

	it( 'should fire callback after the specified delay.', async () => {

		const queue = new DelayQueue();
		queue.delay = 50;

		let called = false;
		const item = { id: 1 };
		queue.add( item, () => {

			called = true;

		} );

		expect( called ).toBe( false );

		await wait( 30 );
		expect( called ).toBe( false );

		await wait( 30 );
		expect( called ).toBe( true );

	} );

	it( 'should process multiple items in order after their delays.', async () => {

		const queue = new DelayQueue();
		queue.delay = 50;

		const results = [];
		queue.add( { id: 1 }, item => results.push( item.id ) );
		queue.add( { id: 2 }, item => results.push( item.id ) );
		queue.add( { id: 3 }, item => results.push( item.id ) );

		await wait( 60 );
		expect( results ).toEqual( [ 1, 2, 3 ] );

	} );

	it( 'should batch process items added at different times.', async () => {

		const queue = new DelayQueue();
		queue.delay = 50;

		const results = [];
		queue.add( { id: 1 }, item => results.push( item.id ) );

		await wait( 20 );
		queue.add( { id: 2 }, item => results.push( item.id ) );

		await wait( 40 );
		expect( results ).toEqual( [ 1 ] );

		await wait( 20 );
		expect( results ).toEqual( [ 1, 2 ] );

	} );

	it( 'should return a promise that resolves with callback result.', async () => {

		const queue = new DelayQueue();
		queue.delay = 10;

		const promise = queue.add( { id: 1 }, async () => {

			await wait( 5 );
			return 'success';

		} );

		const result = await promise;
		expect( result ).toBe( 'success' );

	} );

	it( 'should remove items from the queue.', async () => {

		const queue = new DelayQueue();
		queue.delay = 50;

		const results = [];
		const item1 = { id: 1 };
		const item2 = { id: 2 };
		const item3 = { id: 3 };

		queue.add( item1, item => results.push( item.id ) );
		queue.add( item2, item => results.push( item.id ) );
		queue.add( item3, item => results.push( item.id ) );

		queue.remove( item2 );

		await wait( 60 );
		expect( results ).toEqual( [ 1, 3 ] );

	} );

	it( 'should reject promise when item is removed.', async () => {

		const queue = new DelayQueue();
		queue.delay = 50;

		const item = { id: 1 };
		let rejected = false;

		const promise = queue.add( item, () => 'success' ).catch( () => {

			rejected = true;

		} );

		queue.remove( item );

		await promise;
		expect( rejected ).toBe( true );

	} );

	it( 'should update delay retroactively.', async () => {

		const queue = new DelayQueue();
		queue.delay = 100;

		let called = false;
		queue.add( { id: 1 }, () => {

			called = true;

		} );

		await wait( 30 );
		queue.delay = 50;

		await wait( 30 );
		expect( called ).toBe( true );

		// Test increasing delay
		queue.delay = 50;
		called = false;
		queue.add( { id: 2 }, () => {

			called = true;

		} );

		await wait( 30 );
		queue.delay = 100;

		await wait( 30 );
		expect( called ).toBe( false );

		await wait( 50 );
		expect( called ).toBe( true );

	} );

	it( 'should handle errors in callbacks.', async () => {

		const queue = new DelayQueue();
		queue.delay = 10;

		let rejected = false;
		let rejectedMessage = null;
		const promise = queue.add( { id: 1 }, () => {

			throw new Error( 'test error' );

		} ).catch( err => {

			rejected = true;
			rejectedMessage = err.message;

		} );

		await promise;
		expect( rejected ).toBe( true );
		expect( rejectedMessage ).toBe( 'test error' );

	} );

	it( 'should continue processing after an error.', async () => {

		const queue = new DelayQueue();
		queue.delay = 10;

		const results = [];

		queue.add( { id: 1 }, () => {

			throw new Error( 'error' );

		} ).catch( () => {} );

		queue.add( { id: 2 }, item => results.push( item.id ) );
		queue.add( { id: 3 }, item => results.push( item.id ) );

		await wait( 20 );
		expect( results ).toEqual( [ 2, 3 ] );

	} );

} );
