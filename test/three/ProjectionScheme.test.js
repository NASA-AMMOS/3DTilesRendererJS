import { ProjectionScheme } from '../../src/three/plugins/images/utils/ProjectionScheme.js';
import { MathUtils } from 'three';

describe( 'ProjectionScheme', () => {

	it( 'should throw an error if using a non supported projection type', () => {

		let thrown = false;
		let scheme = null;
		try {

			scheme = new ProjectionScheme( 'TEST' );

		} catch {

			thrown = true;

		}

		expect( thrown ).toBe( true );

		thrown = false;
		try {

			scheme = new ProjectionScheme();
			scheme.setProjection( 'TEST' );

		} catch {

			thrown = true;

		}

		expect( thrown ).toBe( true );

	} );

	it( 'should report as Mercator', () => {

		const scheme = new ProjectionScheme( 'EPSG:3857' );
		expect( scheme.isMercator ).toBe( true );
		expect( scheme.tileCountX ).toBe( 1 );
		expect( scheme.tileCountY ).toBe( 1 );

		// bounds
		const degBounds = scheme.getBounds()
			.map( v => v * MathUtils.RAD2DEG )
			.map( v => v.toFixed( 3 ) )
			.map( s => parseFloat( s ) );
		expect( degBounds ).toEqual( [ - 180, - 85.051, 180, 85.051 ] );

		// conversions
		expect( scheme.fromCartographicToNormalized( 0, 0 ) ).toEqual( [ 0.5, 0.5 ] );

		// derivatives
		expect( scheme.getDerivativeAtNormalizedPoint( 0.5, 0.5 )[ 0 ] ).toBeCloseTo( 2 * Math.PI );
		expect( scheme.getDerivativeAtNormalizedPoint( 0.5, 0.5 )[ 1 ] ).toBeCloseTo( 2 * Math.PI );
		expect( scheme.getDerivativeAtNormalizedPoint( 0.5, 0 )[ 1 ] ).toBeCloseTo( 0.54204 );

	} );

	it( 'should report as Geodetic', () => {

		const scheme = new ProjectionScheme( 'EPSG:4326' );
		expect( scheme.isMercator ).toBe( false );
		expect( scheme.tileCountX ).toBe( 2 );
		expect( scheme.tileCountY ).toBe( 1 );

		// bounds
		const degBounds = scheme.getBounds().map( v => v * MathUtils.RAD2DEG );
		expect( degBounds ).toEqual( [ - 180, - 90, 180, 90 ] );

		// conversions
		expect( scheme.fromCartographicToNormalized( 0, 0 ) ).toEqual( [ 0.5, 0.5 ] );

		// derivatives
		expect( scheme.getDerivativeAtNormalizedPoint( 0.5, 0.5 )[ 0 ] ).toBeCloseTo( 2 * Math.PI );
		expect( scheme.getDerivativeAtNormalizedPoint( 0.5, 0.5 )[ 1 ] ).toBeCloseTo( Math.PI );

	} );

	it( 'should support none projection scheme', () => {

		const scheme = new ProjectionScheme( 'none' );
		expect( scheme.isMercator ).toBe( false );
		expect( scheme.tileCountX ).toBe( 1 );
		expect( scheme.tileCountY ).toBe( 1 );

		// bounds should be identity [0, 0, 1, 1]
		expect( scheme.getBounds() ).toEqual( [ 0, 0, 1, 1 ] );

		// conversions should act as identity functions
		expect( scheme.fromCartographicToNormalized( 0, 0 ) ).toEqual( [ 0, 0 ] );
		expect( scheme.fromCartographicToNormalized( 0.5, 0.5 ) ).toEqual( [ 0.5, 0.5 ] );
		expect( scheme.fromCartographicToNormalized( 1, 1 ) ).toEqual( [ 1, 1 ] );

		expect( scheme.fromNormalizedToCartographic( 0, 0 ) ).toEqual( [ 0, 0 ] );
		expect( scheme.fromNormalizedToCartographic( 0.5, 0.5 ) ).toEqual( [ 0.5, 0.5 ] );
		expect( scheme.fromNormalizedToCartographic( 1, 1 ) ).toEqual( [ 1, 1 ] );

		// derivatives should be 1 (identity derivative)
		expect( scheme.getDerivativeAtNormalizedPoint( 0.5, 0.5 ) ).toEqual( [ 1, 1 ] );
		expect( scheme.getDerivativeAtNormalizedPoint( 0, 0 ) ).toEqual( [ 1, 1 ] );

		// helper methods should also act as identity
		expect( scheme.fromCartographicToNormalized( 0.3, 0.7 ) ).toEqual( [ 0.3, 0.7 ] );
		expect( scheme.fromNormalizedToCartographic( 0.3, 0.7 ) ).toEqual( [ 0.3, 0.7 ] );
		expect( scheme.fromCartographicToNormalizedRange( [ 0.1, 0.2, 0.8, 0.9 ] ) ).toEqual( [ 0.1, 0.2, 0.8, 0.9 ] );
		expect( scheme.fromNormalizedToCartographicRange( [ 0.1, 0.2, 0.8, 0.9 ] ) ).toEqual( [ 0.1, 0.2, 0.8, 0.9 ] );

		// clamping should work with [0, 0, 1, 1] bounds
		expect( scheme.clampToBounds( [ - 0.5, - 0.5, 1.5, 1.5 ], true ) ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.clampToBounds( [ - 0.5, - 0.5, 1.5, 1.5 ], false ) ).toEqual( [ 0, 0, 1, 1 ] );

	} );

	it( 'should write the point conversions into the provided target.', () => {

		const scheme = new ProjectionScheme( 'EPSG:4326' );
		const target = [ 0, 0 ];

		expect( scheme.fromCartographicToNormalized( 0, 0, target ) ).toBe( target );
		expect( target ).toEqual( [ 0.5, 0.5 ] );

		expect( scheme.fromNormalizedToCartographic( 0.5, 0.5, target ) ).toBe( target );
		expect( target ).toEqual( [ 0, 0 ] );

	} );

	it( 'should round trip points through the mercator point functions.', () => {

		const scheme = new ProjectionScheme( 'EPSG:3857' );
		const [ lon, lat ] = scheme.fromNormalizedToCartographic( 0.3, 0.7 );
		const [ u, v ] = scheme.fromCartographicToNormalized( lon, lat );

		expect( u ).toBeCloseTo( 0.3, 12 );
		expect( v ).toBeCloseTo( 0.7, 12 );

	} );

} );
