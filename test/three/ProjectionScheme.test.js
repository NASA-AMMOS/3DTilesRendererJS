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
		expect( scheme.convertLatitudeToNormalized( 0 ) ).toBe( 0.5 );
		expect( scheme.convertLongitudeToNormalized( 0 ) ).toBe( 0.5 );

		// derivatives
		expect( scheme.getLongitudeDerivativeAtNormalized( 0.5 ) ).toBe( 2 * Math.PI );
		expect( scheme.getLatitudeDerivativeAtNormalized( 0.5 ) ).toBeCloseTo( 2 * Math.PI );
		expect( scheme.getLatitudeDerivativeAtNormalized( 0 ) ).toBeCloseTo( 0.54204 );

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
		expect( scheme.convertLatitudeToNormalized( 0 ) ).toBe( 0.5 );
		expect( scheme.convertLongitudeToNormalized( 0 ) ).toBe( 0.5 );

		// derivatives
		expect( scheme.getLongitudeDerivativeAtNormalized( 0.5 ) ).toBe( 2 * Math.PI );
		expect( scheme.getLatitudeDerivativeAtNormalized( 0.5 ) ).toBe( Math.PI );

	} );

	it( 'should support none projection scheme', () => {

		const scheme = new ProjectionScheme( 'none' );
		expect( scheme.isMercator ).toBe( false );
		expect( scheme.tileCountX ).toBe( 1 );
		expect( scheme.tileCountY ).toBe( 1 );

		// bounds should be identity [0, 0, 1, 1]
		expect( scheme.getBounds() ).toEqual( [ 0, 0, 1, 1 ] );

		// conversions should act as identity functions
		expect( scheme.convertLatitudeToNormalized( 0.5 ) ).toBe( 0.5 );
		expect( scheme.convertLongitudeToNormalized( 0.5 ) ).toBe( 0.5 );
		expect( scheme.convertLatitudeToNormalized( 0 ) ).toBe( 0 );
		expect( scheme.convertLongitudeToNormalized( 0 ) ).toBe( 0 );
		expect( scheme.convertLatitudeToNormalized( 1 ) ).toBe( 1 );
		expect( scheme.convertLongitudeToNormalized( 1 ) ).toBe( 1 );

		expect( scheme.convertNormalizedToLatitude( 0.5 ) ).toBe( 0.5 );
		expect( scheme.convertNormalizedToLongitude( 0.5 ) ).toBe( 0.5 );
		expect( scheme.convertNormalizedToLatitude( 0 ) ).toBe( 0 );
		expect( scheme.convertNormalizedToLongitude( 0 ) ).toBe( 0 );
		expect( scheme.convertNormalizedToLatitude( 1 ) ).toBe( 1 );
		expect( scheme.convertNormalizedToLongitude( 1 ) ).toBe( 1 );

		// derivatives should be 1 (identity derivative)
		expect( scheme.getLongitudeDerivativeAtNormalized( 0.5 ) ).toBe( 1 );
		expect( scheme.getLatitudeDerivativeAtNormalized( 0.5 ) ).toBe( 1 );
		expect( scheme.getLongitudeDerivativeAtNormalized( 0 ) ).toBe( 1 );
		expect( scheme.getLatitudeDerivativeAtNormalized( 0 ) ).toBe( 1 );

		// helper methods should also act as identity
		expect( scheme.toNormalizedPoint( 0.3, 0.7 ) ).toEqual( [ 0.3, 0.7 ] );
		expect( scheme.toCartographicPoint( 0.3, 0.7 ) ).toEqual( [ 0.3, 0.7 ] );
		expect( scheme.toNormalizedRange( [ 0.1, 0.2, 0.8, 0.9 ] ) ).toEqual( [ 0.1, 0.2, 0.8, 0.9 ] );
		expect( scheme.toCartographicRange( [ 0.1, 0.2, 0.8, 0.9 ] ) ).toEqual( [ 0.1, 0.2, 0.8, 0.9 ] );

		// clamping should work with [0, 0, 1, 1] bounds
		expect( scheme.clampToBounds( [ - 0.5, - 0.5, 1.5, 1.5 ], true ) ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.clampToBounds( [ - 0.5, - 0.5, 1.5, 1.5 ], false ) ).toEqual( [ 0, 0, 1, 1 ] );

	} );

} );
