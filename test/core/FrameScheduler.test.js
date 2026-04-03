import { FrameScheduler } from '../../src/core/renderer/utilities/FrameScheduler.js';

const nextFrame = async () => new Promise( resolve => requestAnimationFrame( resolve ) );
describe( 'FrameScheduler', () => {

	beforeEach( () => {

		FrameScheduler.flushPending();
		FrameScheduler.setXRSession( null );

	} );

	it( 'should fire callbacks.', async () => {

		let called = false;
		FrameScheduler.requestAnimationFrame( () => called = true );
		expect( called ).toBe( false );

		await nextFrame();
		expect( called ).toBe( true );

	} );

	it( 'should flush callbacks.', () => {

		let called = false;
		FrameScheduler.requestAnimationFrame( () => called = true );
		FrameScheduler.flushPending();

		expect( called ).toBe( true );
		expect( FrameScheduler.pending.size ).toBe( 0 );

	} );

	it( 'should allow for cancelling callbacks.', async () => {

		let called = false;
		const handle = FrameScheduler.requestAnimationFrame( () => called = true );
		expect( called ).toBe( false );

		FrameScheduler.cancelAnimationFrame( handle );
		expect( called ).toBe( false );

		await nextFrame();
		expect( called ).toBe( false );

	} );

	it( 'should flush callbacks when setting xr session.', () => {

		let called = false;
		FrameScheduler.requestAnimationFrame( () => called = true );
		FrameScheduler.setXRSession( {} );
		expect( called ).toBe( true );

	} );

	it( 'should use the xr session rAF if set.', async () => {

		let called = false;
		let cancelledHandle = null;
		FrameScheduler.setXRSession( {
			requestAnimationFrame: () => called = true,
			cancelAnimationFrame: handle => cancelledHandle = handle,
		} );

		const handle = FrameScheduler.requestAnimationFrame( () => {} );
		expect( called ).toBe( true );

		FrameScheduler.cancelAnimationFrame( handle );
		expect( cancelledHandle ).toBe( handle );

	} );

	it( 'should not flush callbacks when setting the same session.', () => {

		let called = false;
		let xrSession = {
			requestAnimationFrame,
			cancelAnimationFrame,
		};

		FrameScheduler.requestAnimationFrame( () => called = true );
		FrameScheduler.setXRSession( null );
		expect( called ).toBe( false );

		FrameScheduler.setXRSession( xrSession );
		expect( called ).toBe( true );

		called = false;
		FrameScheduler.requestAnimationFrame( () => called = true );
		FrameScheduler.setXRSession( xrSession );
		expect( called ).toBe( false );

	} );

} );
