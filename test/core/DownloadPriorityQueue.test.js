import { DownloadPriorityQueue } from '../../src/core/renderer/utilities/DownloadPriorityQueue.js';

describe( 'DownloadPriorityQueue', () => {

	it( 'should run the requests to separate servers independently.', () => {

		const queue = new DownloadPriorityQueue();
		queue.autoUpdate = false;
		queue.maxJobsPerOrigin = 2;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( 'https://a.com/1.png', {}, job( 'a1' ) );
		queue.add( 'https://a.com/2.png', {}, job( 'a2' ) );
		queue.add( 'https://a.com/3.png', {}, job( 'a3' ) );
		queue.add( 'https://b.com/1.png', {}, job( 'b1' ) );
		queue.add( 'https://b.com/2.png', {}, job( 'b2' ) );
		queue.add( 'https://b.com/3.png', {}, job( 'b3' ) );
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a1', 'a2', 'b1', 'b2' ] );
		expect( queue.currJobs ).toEqual( 4 );
		expect( queue.items ).toHaveLength( 2 );

	} );

	it( 'should immediately run requests to a new server while another is saturated.', () => {

		const queue = new DownloadPriorityQueue();
		queue.autoUpdate = false;
		queue.maxJobsPerOrigin = 2;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( 'https://a.com/1.png', {}, job( 'a1' ) );
		queue.add( 'https://a.com/2.png', {}, job( 'a2' ) );
		queue.add( 'https://a.com/3.png', {}, job( 'a3' ) );
		queue.add( 'https://a.com/4.png', {}, job( 'a4' ) );
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a1', 'a2' ] );

		// requests to a new server start without waiting for the saturated one to finish anything
		queue.add( 'https://b.com/1.png', {}, job( 'b1' ) );
		queue.add( 'https://b.com/2.png', {}, job( 'b2' ) );
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a1', 'a2', 'b1', 'b2' ] );

	} );

	it( 'should still apply the total job limit when set.', () => {

		const queue = new DownloadPriorityQueue();
		queue.autoUpdate = false;
		queue.maxJobs = 3;
		queue.maxJobsPerOrigin = 2;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( 'https://a.com/1.png', {}, job( 'a1' ) );
		queue.add( 'https://a.com/2.png', {}, job( 'a2' ) );
		queue.add( 'https://b.com/1.png', {}, job( 'b1' ) );
		queue.add( 'https://b.com/2.png', {}, job( 'b2' ) );
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a1', 'a2', 'b1' ] );

	} );

	it( 'should run further jobs for an origin once one completes.', async () => {

		const queue = new DownloadPriorityQueue();
		queue.autoUpdate = false;
		queue.maxJobsPerOrigin = 1;

		const running = [];
		let resolveFirst = null;
		const first = queue.add( 'https://a.com/1.png', {}, () => new Promise( resolve => {

			running.push( 'a1' );
			resolveFirst = resolve;

		} ) );
		queue.add( 'https://a.com/2.png', {}, () => new Promise( () => running.push( 'a2' ) ) );
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a1' ] );

		resolveFirst();
		await first;

		// the queue marks the job completed a couple of microtasks after its promise resolves
		await Promise.resolve();
		await Promise.resolve();
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a1', 'a2' ] );
		expect( queue.originJobs.get( 'https://a.com' ) ).toEqual( 1 );

	} );

	it( 'should limit the items added without a url as their own group.', () => {

		const queue = new DownloadPriorityQueue();
		queue.autoUpdate = false;
		queue.maxJobsPerOrigin = 1;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( null, {}, job( 'a' ) );
		queue.add( null, {}, job( 'b' ) );
		queue.add( 'https://a.com/1.png', {}, job( 'c' ) );
		queue.tryRunJobs();

		expect( running ).toEqual( [ 'a', 'c' ] );

	} );

	it( 'should throw when an item is re-added with a different origin.', () => {

		const queue = new DownloadPriorityQueue();
		queue.autoUpdate = false;

		const item = {};
		const callback = () => new Promise( () => {} );
		queue.add( 'https://a.com/1.png', item, callback ).catch( () => {} );

		expect( () => queue.add( 'https://b.com/1.png', item, callback ) ).toThrow();
		expect( () => queue.add( 'https://a.com/2.png', item, callback ) ).not.toThrow();

	} );

} );
