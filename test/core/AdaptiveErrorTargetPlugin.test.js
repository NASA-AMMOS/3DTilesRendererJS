import { AdaptiveErrorTargetPlugin } from '../../src/core/plugins/AdaptiveErrorTargetPlugin.js';

// Minimal stand in for the renderer fields the plugin reads, so the cache state and the number of
// refused tiles can be driven directly.
class FakeTilesRenderer {

	constructor() {

		this.errorTarget = 16;
		this.frameCount = 0;
		this.stats = { refused: 0 };
		this.lruCache = {
			full: false,
			isFull() {

				return this.full;

			},
		};
		this._listeners = {};

	}

	addEventListener( type, callback ) {

		const listeners = this._listeners[ type ] || ( this._listeners[ type ] = [] );
		listeners.push( callback );

	}

	removeEventListener( type, callback ) {

		const listeners = this._listeners[ type ];
		if ( listeners ) {

			this._listeners[ type ] = listeners.filter( c => c !== callback );

		}

	}

	dispatchEvent( event ) {

		const listeners = this._listeners[ event.type ];
		if ( listeners ) {

			listeners.slice().forEach( callback => callback( event ) );

		}

	}

	// simulate a traversal that refused "refused" tiles with the cache in its current state
	update( refused = 0, full = false ) {

		this.stats.refused = refused;
		this.lruCache.full = full;
		this.frameCount ++;
		this.dispatchEvent( { type: 'update-after' } );

	}

}

describe( 'AdaptiveErrorTargetPlugin', () => {

	let tiles, plugin, currentTime;

	// runs "count" updates spaced by "holdTime" so each one lands at the end of a hold window
	function runUpdates( count, refused, full, step = 2500 ) {

		for ( let i = 0; i < count; i ++ ) {

			currentTime += step;
			tiles.update( refused, full );

		}

	}

	beforeEach( () => {

		currentTime = 0;
		vi.spyOn( performance, 'now' ).mockImplementation( () => currentTime );
		tiles = new FakeTilesRenderer();

	} );

	afterEach( () => {

		plugin.dispose();
		vi.restoreAllMocks();

	} );

	it( 'should not change the error target before the hold time has elapsed', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );
		expect( tiles.errorTarget ).toBe( 16 );

		currentTime = 2499;
		tiles.update( 5, true );
		expect( tiles.errorTarget ).toBe( 16 );

		currentTime = 2500;
		tiles.update( 5, true );
		expect( tiles.errorTarget ).toBe( 24 );

	} );

	it( 'should step the error target up while tiles are refused and stop at the ceiling', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );

		runUpdates( 1, 5, true );
		expect( tiles.errorTarget ).toBe( 24 );

		runUpdates( 1, 5, true );
		expect( tiles.errorTarget ).toBe( 36 );

		runUpdates( 1, 5, true );
		expect( tiles.errorTarget ).toBe( 54 );

		// 54 * 1.5 is above the default ceiling of 4x the initial target
		runUpdates( 1, 5, true );
		expect( tiles.errorTarget ).toBe( 64 );

		runUpdates( 5, 5, true );
		expect( tiles.errorTarget ).toBe( 64 );

	} );

	it( 'should respect an explicit "maxErrorTarget"', () => {

		plugin = new AdaptiveErrorTargetPlugin( { maxErrorTarget: 30 } );
		plugin.init( tiles );

		tiles.update( 5, true );
		runUpdates( 10, 5, true );

		expect( tiles.errorTarget ).toBe( 30 );

	} );

	it( 'should step the error target back down to the initial value once the cache has room', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );
		runUpdates( 2, 5, true );
		expect( tiles.errorTarget ).toBe( 36 );

		tiles.update( 0, false );
		runUpdates( 1, 0, false );
		expect( tiles.errorTarget ).toBe( 24 );

		runUpdates( 1, 0, false );
		expect( tiles.errorTarget ).toBe( 16 );

		// never below the value the application set
		runUpdates( 5, 0, false );
		expect( tiles.errorTarget ).toBe( 16 );

	} );

	it( 'should not change the error target when the cache is full but no tiles are refused', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 0, true );
		runUpdates( 10, 0, true );

		expect( tiles.errorTarget ).toBe( 16 );

	} );

	it( 'should not change the error target when tiles are refused but the cache is not full', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, false );
		runUpdates( 10, 5, false );

		expect( tiles.errorTarget ).toBe( 16 );

	} );

	it( 'should require a continuous hold window for every step', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );

		// the cache is briefly satisfied, which resets the window
		currentTime += 2000;
		tiles.update( 0, false );

		currentTime += 2000;
		tiles.update( 5, true );
		expect( tiles.errorTarget ).toBe( 16 );

		currentTime += 2500;
		tiles.update( 5, true );
		expect( tiles.errorTarget ).toBe( 24 );

	} );

	it( 'should report every change through "onChange"', () => {

		const changes = [];
		plugin = new AdaptiveErrorTargetPlugin( { onChange: info => changes.push( info ) } );
		plugin.init( tiles );

		tiles.update( 5, true );
		runUpdates( 1, 5, true );
		runUpdates( 1, 0, false );
		runUpdates( 1, 0, false );

		expect( changes ).toEqual( [
			{ errorTarget: 24, previousErrorTarget: 16, reason: 'cache-full' },
			{ errorTarget: 16, previousErrorTarget: 24, reason: 'cache-available' },
		] );

	} );

	it( 'should adopt an error target assigned by the application as the new base value', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );
		runUpdates( 1, 5, true );
		expect( tiles.errorTarget ).toBe( 24 );

		// the application takes control of the error target
		tiles.errorTarget = 8;

		runUpdates( 5, 0, false );
		expect( tiles.errorTarget ).toBe( 8 );
		expect( plugin.baseErrorTarget ).toBe( 8 );
		expect( plugin.errorTargetCeiling ).toBe( 32 );

	} );

	it( 'should ignore updates that did not run a traversal', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );

		// an update skipped by a plugin dispatches the events without incrementing the frame count
		// and leaves the previous stats in place
		currentTime += 5000;
		tiles.dispatchEvent( { type: 'update-after' } );

		expect( tiles.errorTarget ).toBe( 16 );

	} );

	it( 'should restore the error target on dispose', () => {

		plugin = new AdaptiveErrorTargetPlugin();
		plugin.init( tiles );

		tiles.update( 5, true );
		runUpdates( 2, 5, true );
		expect( tiles.errorTarget ).toBe( 36 );

		plugin.dispose();
		expect( tiles.errorTarget ).toBe( 16 );

		// the plugin no longer reacts to updates
		runUpdates( 5, 5, true );
		expect( tiles.errorTarget ).toBe( 16 );

	} );

} );
