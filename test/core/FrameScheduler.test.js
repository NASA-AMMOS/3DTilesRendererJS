import { FrameScheduler } from '../../src/core/renderer/utilities/FrameScheduler.js';

const nextFrame = async () => new Promise( resolve => requestAnimationFrame( resolve ) );
describe( 'FrameScheduler', () => {

	let scheduler;
	beforeEach( () => {

		scheduler = new FrameScheduler();

	} );

	it( 'should fire callbacks.', async () => {

		let called = false;
		scheduler.requestAnimationFrame( () => called = true );
		expect( called ).toBe( false );

		await nextFrame();
		expect( called ).toBe( true );

	} );

	it( 'should flush callbacks.', () => {

		let called = false;
		scheduler.requestAnimationFrame( () => called = true );
		scheduler.flushPending();

		expect( called ).toBe( true );
		expect( scheduler.pending.size ).toBe( 0 );

	} );

	it( 'should allow for cancelling callbacks.', async () => {

		let called = false;
		const handle = scheduler.requestAnimationFrame( () => called = true );
		expect( called ).toBe( false );

		scheduler.cancelAnimationFrame( handle );
		expect( called ).toBe( false );

		await nextFrame();
		expect( called ).toBe( false );

	} );

	it( 'should flush callbacks when setting xr session.', () => {

		let called = false;
		scheduler.requestAnimationFrame( () => called = true );
		scheduler.setXRSession( {} );
		expect( called ).toBe( true );

	} );

	it( 'should use the xr session rAF if set.', async () => {

		let called = false;
		let cancelledHandle = null;
		scheduler.setXRSession( {
			requestAnimationFrame: () => called = true,
			cancelAnimationFrame: handle => cancelledHandle = handle,
		} );

		const handle = scheduler.requestAnimationFrame( () => {} );
		expect( called ).toBe( true );

		scheduler.cancelAnimationFrame( handle );
		expect( cancelledHandle ).toBe( handle );

	} );

	it( 'should not flush callbacks when setting the same session.', () => {

		let called = false;
		let xrSession = {
			requestAnimationFrame,
			cancelAnimationFrame,
		};

		scheduler.requestAnimationFrame( () => called = true );
		scheduler.setXRSession( null );
		expect( called ).toBe( false );

		scheduler.setXRSession( xrSession );
		expect( called ).toBe( true );

		called = false;
		scheduler.requestAnimationFrame( () => called = true );
		scheduler.setXRSession( xrSession );
		expect( called ).toBe( false );

	} );

} );
