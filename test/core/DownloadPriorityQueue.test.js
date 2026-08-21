import { DownloadPriorityQueue } from '../../src/core/renderer/utilities/DownloadPriorityQueue.js';

describe( 'DownloadPriorityQueue', () => {

	it( 'should run the requests to separate servers independently.', () => {

		const queue = new DownloadPriorityQueue();
		queue.maxJobsPerOrigin = 2;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( 'https://a.com/1.png', {}, job( 'a1' ) );
		queue.add( 'https://a.com/2.png', {}, job( 'a2' ) );
		queue.add( 'https://a.com/3.png', {}, job( 'a3' ) );
		queue.add( 'https://b.com/1.png', {}, job( 'b1' ) );
		queue.add( 'https://b.com/2.png', {}, job( 'b2' ) );
		queue.add( 'https://b.com/3.png', {}, job( 'b3' ) );
		queue.originQueues.forEach( q => q.tryRunJobs() );

		expect( running ).toEqual( [ 'a1', 'a2', 'b1', 'b2' ] );

	} );

	it( 'should immediately run requests to a new server while another is saturated.', () => {

		const queue = new DownloadPriorityQueue();
		queue.maxJobsPerOrigin = 2;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( 'https://a.com/1.png', {}, job( 'a1' ) );
		queue.add( 'https://a.com/2.png', {}, job( 'a2' ) );
		queue.add( 'https://a.com/3.png', {}, job( 'a3' ) );
		queue.add( 'https://a.com/4.png', {}, job( 'a4' ) );
		queue.originQueues.forEach( q => q.tryRunJobs() );

		expect( running ).toEqual( [ 'a1', 'a2' ] );

		// requests to a new server start without waiting for the saturated one to finish anything
		queue.add( 'https://b.com/1.png', {}, job( 'b1' ) );
		queue.add( 'https://b.com/2.png', {}, job( 'b2' ) );
		queue.originQueues.forEach( q => q.tryRunJobs() );

		expect( running ).toEqual( [ 'a1', 'a2', 'b1', 'b2' ] );

	} );

	it( 'should run further jobs for an origin once one completes.', async () => {

		const queue = new DownloadPriorityQueue();
		queue.maxJobsPerOrigin = 1;

		const running = [];
		let resolveFirst = null;
		const first = queue.add( 'https://a.com/1.png', {}, () => new Promise( resolve => {

			running.push( 'a1' );
			resolveFirst = resolve;

		} ) );
		queue.add( 'https://a.com/2.png', {}, () => new Promise( () => running.push( 'a2' ) ) );

		const originQueue = queue.originQueues.get( 'https://a.com' );
		originQueue.autoUpdate = false;
		originQueue.tryRunJobs();

		expect( running ).toEqual( [ 'a1' ] );

		resolveFirst();
		await first;

		// the queue marks the job completed a couple of microtasks after its promise resolves
		await Promise.resolve();
		await Promise.resolve();
		originQueue.tryRunJobs();

		expect( running ).toEqual( [ 'a1', 'a2' ] );
		expect( originQueue.currJobs ).toEqual( 1 );

	} );

	it( 'should manage the items added without a url as their own group.', () => {

		const queue = new DownloadPriorityQueue();
		queue.maxJobsPerOrigin = 1;

		const running = [];
		const job = name => () => new Promise( () => running.push( name ) );
		queue.add( null, {}, job( 'a' ) );
		queue.add( null, {}, job( 'b' ) );
		queue.add( 'https://a.com/1.png', {}, job( 'c' ) );
		queue.originQueues.forEach( q => q.tryRunJobs() );

		expect( running ).toEqual( [ 'a', 'c' ] );

	} );

	it( 'should remove queues for origins with no remaining work.', async () => {

		const queue = new DownloadPriorityQueue();

		const promise = queue.add( 'https://a.com/1.png', {}, () => 100 );
		expect( queue.originQueues.size ).toEqual( 1 );

		await promise;

		// drained queues are pruned when new items are added
		queue.add( 'https://b.com/1.png', {}, () => new Promise( () => {} ) );
		expect( queue.originQueues.has( 'https://a.com' ) ).toEqual( false );
		expect( queue.originQueues.size ).toEqual( 1 );

	} );

	it( 'should throw when an item is re-added with a different origin.', () => {

		const queue = new DownloadPriorityQueue();

		const item = {};
		const callback = () => new Promise( () => {} );
		queue.add( 'https://a.com/1.png', item, callback ).catch( () => {} );

		expect( () => queue.add( 'https://b.com/1.png', item, callback ) ).toThrow();

	} );

} );
