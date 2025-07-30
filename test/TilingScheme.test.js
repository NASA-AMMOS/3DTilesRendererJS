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
		expect( scheme.contentBounds ).toEqual( [ 0, 0, 1, 1 ] );
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

		expect( scheme.getContentBounds() ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.getContentBounds( true ) ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.getTileBounds( 0, 0, 0 ) ).toEqual( [ 0, 0, 0.5, 1 ] );
		expect( scheme.getTileBounds( 0, 0, 1 ) ).toEqual( [ 0, 0, 0.25, 0.5 ] );

	} );

	it( 'should limit the loadable tiles by the bounds.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );
		scheme.setContentBounds( 0, 0, 0.7, 0.7 );

		expect( scheme.getTileExists( 0, 0, 0 ) ).toBe( true );
		expect( scheme.getTileExists( 1, 0, 0 ) ).toBe( true );

		expect( scheme.getTileExists( 0, 0, 1 ) ).toBe( true );
		expect( scheme.getTileExists( 3, 0, 1 ) ).toBe( false );

	} );

	it( 'should report all the tiles in a given range even if they don\'t exist.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );

		expect( scheme.getTilesInRange( 0, 0, 0.5, 0.5, 2 ) ).toEqual( [ 0, 0, 4, 2 ] );
		expect( scheme.getTilesInRange( 0, 0, 1, 1, 2 ) ).toEqual( [ 0, 0, 7, 3 ] );

		scheme.setContentBounds( 0.3, 0.3, 0.7, 0.7 );
		expect( scheme.getTilesInRange( 0, 0, 0.5, 0.5, 2 ) ).toEqual( [ 0, 0, 4, 2 ] );

	} );

	it( 'should support inferring tile bounds by projection scheme.', () => {

		const scheme = new TilingScheme();
		scheme.generateLevels( 3, 2, 1 );
		scheme.setProjection( new ProjectionScheme() );

		expect( scheme.getContentBounds() ).toEqual( [ - Math.PI, - Math.PI / 2, Math.PI, Math.PI / 2 ] );
		expect( scheme.getContentBounds( true ) ).toEqual( [ 0, 0, 1, 1 ] );
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

	it( 'should correctly report tile indices relative to level tile bounds.', () => {

		const scheme = new TilingScheme();
		scheme.setLevel( 0, {
			tileCountX: 4,
			tileCountY: 4,
			tileBounds: [ 0.5, 0.5, 1, 1 ],
		} );

		expect( scheme.getTileAtPoint( 0.5, 0.5, 0 ) ).toEqual( [ 0, 0 ] );
		expect( scheme.getTileAtPoint( 0.9, 0.75, 0 ) ).toEqual( [ 3, 2 ] );
		expect( scheme.getTileAtPoint( 1.1, 0, 0 ) ).toEqual( [ 4, - 4 ] );
		expect( scheme.getTileAtPoint( 1.13, - 0.1, 0 ) ).toEqual( [ 5, - 5 ] );

		scheme.flipY = true;
		expect( scheme.getTileAtPoint( 0.5, 0.5, 0 ) ).toEqual( [ 0, 3 ] );
		expect( scheme.getTileAtPoint( 0.9, 0.75, 0 ) ).toEqual( [ 3, 1 ] );
		expect( scheme.getTileAtPoint( 1.1, 0, 0 ) ).toEqual( [ 4, 7 ] );
		expect( scheme.getTileAtPoint( 1.13, - 0.1, 0 ) ).toEqual( [ 5, 8 ] );

	} );

	it( 'should correctly report the set of tiles in a range relative to level tile bounds.', () => {

		const scheme = new TilingScheme();
		scheme.setLevel( 0, {
			tileCountX: 4,
			tileCountY: 4,
			tileBounds: [ 0.5, 0.5, 1.5, 1.5 ],
		} );

		expect( scheme.getTilesInRange( 0, 0, 0.5, 0.5, 0 ) ).toEqual( [ 0, 0, 0, 0 ] );
		expect( scheme.getTilesInRange( 0, 0, 0.75, 0.75, 0 ) ).toEqual( [ 0, 0, 1, 1 ] );
		expect( scheme.getTilesInRange( 0, 0, 1, 1, 0 ) ).toEqual( [ 0, 0, 2, 2 ] );
		expect( scheme.getTilesInRange( 0.5, 0.5, 1, 1, 0 ) ).toEqual( [ 0, 0, 2, 2 ] );
		expect( scheme.getTilesInRange( 0.5, 0.5, 2, 2, 0 ) ).toEqual( [ 0, 0, 3, 3 ] );

		scheme.flipY = true;
		expect( scheme.getTilesInRange( 0, 0, 0.5, 0.5, 0 ) ).toEqual( [ 0, 3, 0, 3 ] );
		expect( scheme.getTilesInRange( 0, 0, 0.75, 0.75, 0 ) ).toEqual( [ 0, 2, 1, 3 ] );
		expect( scheme.getTilesInRange( 0.5, 0.5, 1, 1, 0 ) ).toEqual( [ 0, 1, 2, 3 ] );
		expect( scheme.getTilesInRange( 0.5, 0.5, 2, 2, 0 ) ).toEqual( [ 0, 0, 3, 3 ] );

	} );

} );
