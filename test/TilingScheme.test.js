import { TilingScheme } from '../src/three/plugins/images/utils/TilingScheme.js';
import { ProjectionScheme } from '../src/three/plugins/images/utils/ProjectionScheme.js';

describe( 'TiltingScheme', () => {

	it( 'should allow for automatically building levels.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 10, 1, 2, {
			minLevel: 5,
			tilePixelWidth: 128,
			tilePixelHeight: 128,
		} );

		expect( scheme.minLevel ).toBe( 5 );
		expect( scheme.maxLevel ).toBe( 9 );
		expect( scheme.levelCount ).toBe( 10 );
		expect( scheme.aspectRatio ).toBe( 0.5 );
		expect( scheme.rootOrigin ).toEqual( [ 0, 0 ] );
		expect( scheme.rootBounds ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.getLevel( 4 ) ).toEqual( null );

		const maxLevel = scheme.getLevel( 9 );
		expect( maxLevel.tilePixelWidth ).toEqual( 128 );
		expect( maxLevel.tilePixelHeight ).toEqual( 128 );
		expect( maxLevel.pixelWidth ).toEqual( 128 * 2 ** 9 );
		expect( maxLevel.pixelHeight ).toEqual( 128 * 2 * 2 ** 9 );
		expect( maxLevel.tileCountX ).toEqual( 2 ** 9 );
		expect( maxLevel.tileCountY ).toEqual( 2 * 2 ** 9 );

	} );

	it( 'should report the bounds of a specific tile correctly.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );

		expect( scheme.getFullBounds() ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.getFullBounds( true ) ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.getTileBounds( 0, 0, 0 ) ).toEqual( [ 0, 0, 0.5, 1 ] );
		expect( scheme.getTileBounds( 0, 0, 1 ) ).toEqual( [ 0, 0, 0.25, 0.5 ] );

	} );

	it( 'should limit the loadable tiles by the bounds.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );
		scheme.setBounds( 0, 0, 0.7, 0.7 );

		expect( scheme.getTileExists( 0, 0, 0 ) ).toBe( true );
		expect( scheme.getTileExists( 1, 0, 0 ) ).toBe( true );

		expect( scheme.getTileExists( 0, 0, 1 ) ).toBe( true );
		expect( scheme.getTileExists( 3, 0, 1 ) ).toBe( false );

	} );

	it( 'should report all the tiles in a given range even if they don\'t exist.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );

		expect( scheme.getTilesInRange( 0, 0, 0.5, 0.5, 2 ) ).toEqual( [ 0, 0, 4, 2 ] );

		scheme.setBounds( 0.3, 0.3, 0.7, 0.7 );
		expect( scheme.getTilesInRange( 0, 0, 0.5, 0.5, 2 ) ).toEqual( [ 0, 0, 4, 2 ] );

	} );

	it( 'should support inferring tile bounds by projection scheme.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );
		scheme.setProjection( new ProjectionScheme() );

		expect( scheme.getFullBounds() ).toEqual( [ - Math.PI, - Math.PI / 2, Math.PI, Math.PI / 2 ] );
		expect( scheme.getFullBounds( true ) ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.toNormalizedPoint( - Math.PI, - Math.PI / 2 ) ).toEqual( [ 0, 0 ] );
		expect( scheme.toNormalizedPoint( 0, 0 ) ).toEqual( [ 0.5, 0.5 ] );

	} );

	it( 'should correctly support tiling sampling outside the valid range.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 1, 1 );

		expect( scheme.getTileAtPoint( - 0.25, - 0.25, 1, true ) ).toEqual( [ - 1, - 1 ] );

	} );

	it( 'should correctly support flipY variable.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 1, 1 );
		scheme.flipY = true;

		expect( scheme.getTileAtPoint( - 0.25, - 0.25, 1, true ) ).toEqual( [ - 1, 2 ] );
		expect( scheme.getTileAtPoint( 0, 0, 1, true ) ).toEqual( [ 0, 1 ] );

	} );

} );
