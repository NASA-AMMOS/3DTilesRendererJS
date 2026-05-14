import { Scheduler } from '../../src/core/renderer/utilities/Scheduler.js';

const nextFrame = async () => new Promise( resolve => requestAnimationFrame( resolve ) );
describe( 'Scheduler', () => {

	beforeEach( () => {

		Scheduler.flushPending();
		Scheduler.setXRSession( null );

	} );

	it( 'should fire callbacks.', async () => {

		let called = false;
		Scheduler.requestAnimationFrame( () => called = true );
		expect( called ).toBe( false );

		await nextFrame();
		expect( called ).toBe( true );

	} );

	it( 'should flush callbacks.', () => {

		let called = false;
		Scheduler.requestAnimationFrame( () => called = true );
		Scheduler.flushPending();

		expect( called ).toBe( true );
		expect( Scheduler.pending.size ).toBe( 0 );

	} );

	it( 'should allow for cancelling callbacks.', async () => {

		let called = false;
		const handle = Scheduler.requestAnimationFrame( () => called = true );
		expect( called ).toBe( false );

		Scheduler.cancelAnimationFrame( handle );
		expect( called ).toBe( false );

		await nextFrame();
		expect( called ).toBe( false );

	} );

	it( 'should flush callbacks when setting xr session.', () => {

		let called = false;
		Scheduler.requestAnimationFrame( () => called = true );
		Scheduler.setXRSession( {} );
		expect( called ).toBe( true );

	} );

	it( 'should use the xr session rAF if set.', async () => {

		let called = false;
		let cancelledHandle = null;
		Scheduler.setXRSession( {
			requestAnimationFrame: () => called = true,
			cancelAnimationFrame: handle => cancelledHandle = handle,
		} );

		const handle = Scheduler.requestAnimationFrame( () => {} );
		expect( called ).toBe( true );

		Scheduler.cancelAnimationFrame( handle );
		expect( cancelledHandle ).toBe( handle );

	} );

	it( 'should not flush callbacks when setting the same session.', () => {

		let called = false;
		let xrSession = {
			requestAnimationFrame,
			cancelAnimationFrame,
		};

		Scheduler.requestAnimationFrame( () => called = true );
		Scheduler.setXRSession( null );
		expect( called ).toBe( false );

		Scheduler.setXRSession( xrSession );
		expect( called ).toBe( true );

		called = false;
		Scheduler.requestAnimationFrame( () => called = true );
		Scheduler.setXRSession( xrSession );
		expect( called ).toBe( false );

	} );

} );
