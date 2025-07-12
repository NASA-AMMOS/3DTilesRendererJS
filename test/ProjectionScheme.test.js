import { ProjectionScheme } from '../src/three/plugins/images/utils/ProjectionScheme.js';
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
		expect( scheme.convertLatitudeToProjection( 0 ) ).toBe( 0.5 );
		expect( scheme.convertLongitudeToProjection( 0 ) ).toBe( 0.5 );

		// derivatives
		expect( scheme.getLongitudeDerivativeAtProjection( 0.5 ) ).toBe( 2 * Math.PI );
		expect( scheme.getLatitudeDerivativeAtProjection( 0.5 ) ).toBeCloseTo( 2 * Math.PI );
		expect( scheme.getLatitudeDerivativeAtProjection( 0 ) ).toBeCloseTo( 0.54204 );

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
		expect( scheme.convertLatitudeToProjection( 0 ) ).toBe( 0.5 );
		expect( scheme.convertLongitudeToProjection( 0 ) ).toBe( 0.5 );

		// derivatives
		expect( scheme.getLongitudeDerivativeAtProjection( 0.5 ) ).toBe( 2 * Math.PI );
		expect( scheme.getLatitudeDerivativeAtProjection( 0.5 ) ).toBe( Math.PI );

	} );

} );
