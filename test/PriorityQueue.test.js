import { PriorityQueue } from '../src/utilities/PriorityQueue.js';

const nextFrame = () => new Promise( resolve => requestAnimationFrame( resolve ) );
const nextTick = () => new Promise( resolve => process.nextTick( resolve ) );

describe( 'PriorityQueue', () => {

	it( 'should run jobs automatically in the correct order.', async () => {

		const queue = new PriorityQueue( 6 );
		queue.add( {}, 6, () => new Promise( () => {} ) );
		queue.add( {}, 3, () => new Promise( () => {} ) );
		queue.add( {}, 4, () => new Promise( () => {} ) );
		queue.add( {}, 0, () => new Promise( () => {} ) );
		queue.add( {}, 8, () => new Promise( () => {} ) );
		queue.add( {}, 2, () => new Promise( () => {} ) );
		queue.add( {}, 1, () => new Promise( () => {} ) );

		await nextFrame();

		expect( queue.items.map( item => item.priority ) ).toEqual( [ 0 ] );
		expect( queue.currJobs ).toEqual( 6 );

	} );

	it( 'should add the jobs in the correct order.', () => {

		const queue = new PriorityQueue();
		queue.add( {}, 6, () => new Promise( () => {} ) );
		queue.add( {}, 3, () => new Promise( () => {} ) );
		queue.add( {}, 4, () => new Promise( () => {} ) );
		queue.add( {}, 0, () => new Promise( () => {} ) );
		queue.add( {}, 8, () => new Promise( () => {} ) );
		queue.add( {}, 2, () => new Promise( () => {} ) );
		queue.add( {}, 1, () => new Promise( () => {} ) );

		expect( queue.items.map( item => item.priority ) ).toEqual( [ 0, 1, 2, 3, 4, 6, 8 ] );

	} );

	it( 'should remove an item from the queue correctly.', () => {

		const A = {};
		const B = {};
		const C = {};
		const D = {};
		const queue = new PriorityQueue();
		queue.add( A, 0, () => new Promise( () => {} ) );
		queue.add( B, 1, () => new Promise( () => {} ) );
		queue.add( C, 2, () => new Promise( () => {} ) );
		queue.add( D, 3, () => new Promise( () => {} ) );

		expect( queue.items.map( item => item.item ) ).toEqual( [ A, B, C, D ] );

		queue.remove( C );
		expect( queue.items.map( item => item.item ) ).toEqual( [ A, B, D ] );

		queue.remove( A );
		expect( queue.items.map( item => item.item ) ).toEqual( [ B, D ] );

		queue.remove( B );
		expect( queue.items.map( item => item.item ) ).toEqual( [ D ] );

		queue.remove( D );
		expect( queue.items.map( item => item.item ) ).toEqual( [] );

	} );

	it( 'should automatically run new jobs when one is finished.', async () => {

		let called = 0;
		let resolveFunc = null;
		const queue = new PriorityQueue( 1 );

		queue.add( {}, 1, () => new Promise( resolve => {

			resolveFunc = resolve;
			called ++;

		} ) );

		queue.add( {}, 0, () => new Promise( () => {

			called ++;

		} ) );

		expect( queue.currJobs ).toEqual( 0 );

		await nextFrame();

		expect( queue.currJobs ).toEqual( 1 );
		expect( resolveFunc ).not.toEqual( null );
		expect( called ).toEqual( 1 );

		resolveFunc();
		await nextFrame();

		expect( queue.currJobs ).toEqual( 1 );
		expect( called ).toEqual( 2 );

	} );

	it( 'should fire the callback with the item and priority.', async () => {

		const A = {};
		const queue = new PriorityQueue();
		queue.add( A, 100, ( item, priority ) => new Promise( () => {

			expect( item ).toEqual( A );
			expect( priority ).toEqual( 100 );

		} ) );

		await nextFrame();

	} );

	it( 'should return a promise that resolves from the add function.',  async () => {

		const queue = new PriorityQueue();
		let result = null;
		queue.add( {}, 0, item => Promise.resolve( 1000 ) ).then( res => result = res );

		expect( result ).toEqual( null );

		await nextFrame();

		expect( result ).toEqual( 1000 );

	} );

} );
