import { PriorityQueue } from '../src/utilities/PriorityQueue.js';

const nextFrame = () => new Promise( resolve => requestAnimationFrame( resolve ) );

describe( 'PriorityQueue', () => {

	it( 'should run jobs automatically in the correct order.', async () => {

		const queue = new PriorityQueue();
		queue.maxJobs = 6;
		queue.priorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;
		queue.add( { priority: 6 }, () => new Promise( () => {} ) );
		queue.add( { priority: 3 }, () => new Promise( () => {} ) );
		queue.add( { priority: 4 }, () => new Promise( () => {} ) );
		queue.add( { priority: 0 }, () => new Promise( () => {} ) );
		queue.add( { priority: 8 }, () => new Promise( () => {} ) );
		queue.add( { priority: 2 }, () => new Promise( () => {} ) );
		queue.add( { priority: 1 }, () => new Promise( () => {} ) );

		await nextFrame();

		expect( queue.items.map( item => item.priority ) ).toEqual( [ 0 ] );
		expect( queue.currJobs ).toEqual( 6 );

	} );

	it( 'should run jobs in the correct order.', async () => {

		const result = [];
		const cb = item => new Promise( resolve => {

			result.push( item.priority );
			resolve();

		} );

		const queue = new PriorityQueue();
		queue.maxJobs = 1;
		queue.priorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;
		queue.add( { priority: 6 }, cb );
		queue.add( { priority: 3 }, cb );
		queue.add( { priority: 4 }, cb );
		queue.add( { priority: 0 }, cb );
		queue.add( { priority: 8 }, cb );
		queue.add( { priority: 2 }, cb );
		queue.add( { priority: 1 }, cb );
		expect( queue.items.length ).toEqual( queue.callbacks.size );

		// We require a new frame to trigger each subsequent task
		for ( let i = 0; i < 7; i ++ ) {

			await nextFrame();

		}

		expect( result ).toEqual( [ 8, 6, 4, 3, 2, 1, 0 ] );
		expect( queue.items.length ).toEqual( queue.callbacks.size );

	} );

	it( 'should remove an item from the queue correctly.', () => {

		const A = { priority: 0 };
		const B = { priority: 1 };
		const C = { priority: 2 };
		const D = { priority: 3 };
		const queue = new PriorityQueue();
		queue.priorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;
		queue.add( A, () => new Promise( () => {} ) );
		queue.add( B, () => new Promise( () => {} ) );
		queue.add( C, () => new Promise( () => {} ) );
		queue.add( D, () => new Promise( () => {} ) );
		queue.sort();

		expect( queue.items ).toEqual( [ A, B, C, D ] );

		queue.remove( C );
		expect( queue.items ).toEqual( [ A, B, D ] );

		queue.remove( A );
		expect( queue.items ).toEqual( [ B, D ] );

		queue.remove( B );
		expect( queue.items ).toEqual( [ D ] );

		queue.remove( D );
		expect( queue.items ).toEqual( [] );
		expect( queue.items.length ).toEqual( queue.callbacks.size );

	} );

	it( 'should automatically run new jobs when one is finished.', async () => {

		let called = 0;
		let resolveFunc = null;
		const queue = new PriorityQueue();
		queue.maxJobs = 1;
		queue.priorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;

		queue.add( { priority: 1 }, () => new Promise( resolve => {

			resolveFunc = resolve;
			called ++;

		} ) );

		queue.add( { priority: 0 }, () => new Promise( () => {

			called ++;

		} ) );

		expect( queue.currJobs ).toEqual( 0 );

		await nextFrame();

		expect( queue.currJobs ).toEqual( 1 );
		expect( resolveFunc ).not.toEqual( null );
		expect( called ).toEqual( 1 );

		resolveFunc();

		// one frame for resolving the promise, one frame schedule new
		// tasks, and one frame to complete the last one.
		await nextFrame();
		await nextFrame();

		expect( queue.currJobs ).toEqual( 1 );
		expect( called ).toEqual( 2 );

	} );

	it( 'should fire the callback with the item and priority.', async () => {

		const A = { priority: 100 };
		const queue = new PriorityQueue();
		queue.priorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;

		queue.add( A, item => new Promise( () => {

			expect( item ).toEqual( A );

		} ) );

		await nextFrame();

	} );

	it( 'should return a promise that resolves from the add function.', async () => {

		const queue = new PriorityQueue();
		queue.priorityCallback = ( itemA, itemB ) => itemA.priority - itemB.priority;

		let result = null;
		queue.add( { priority: 0 }, item => Promise.resolve( 1000 ) ).then( res => result = res );

		expect( result ).toEqual( null );

		await nextFrame();

		expect( result ).toEqual( 1000 );

	} );

	it( 'should not automatically run if autoUpdate is false.', async () => {

		const queue = new PriorityQueue();
		queue.priorityCallback = () => 0;
		queue.autoUpdate = false;
		queue.maxJobs = 1;

		queue.add( {}, async () => {} );
		queue.add( {}, async () => {} );

		expect( queue.items ).toHaveLength( 2 );

		await nextFrame();

		expect( queue.items ).toHaveLength( 2 );

		queue.scheduleJobRun();
		await nextFrame();

		expect( queue.items ).toHaveLength( 1 );

		await nextFrame();

		expect( queue.items ).toHaveLength( 1 );

		queue.scheduleJobRun();
		await nextFrame();

		expect( queue.items ).toHaveLength( 0 );

	} );

} );
