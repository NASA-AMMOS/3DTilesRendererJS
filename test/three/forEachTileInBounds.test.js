import { forEachTileInBounds } from '../../src/three/plugins/images/overlays/utils.js';
import { TilingScheme } from '../../src/three/plugins/images/utils/TilingScheme.js';

function collectTiles( range, level, tiling ) {

	const tiles = [];
	forEachTileInBounds( range, level, tiling, ( x, y, l ) => {

		tiles.push( [ x, y, l ] );

	} );

	return tiles;

}

describe( 'forEachTileInBounds', () => {

	// span of one tile at level 19 in normalized units
	const LEVEL = 19;
	const TILE_SPAN = 1 / 2 ** 19;

	let scheme;
	beforeEach( () => {

		scheme = new TilingScheme();
		scheme.generateLevels( 21, 1, 1 );

	} );

	it( 'should report exactly one tile when the range matches a single tile with float error.', () => {

		const NOISE = 1e-12;
		const range = [
			1000 * TILE_SPAN - NOISE,
			1000 * TILE_SPAN - NOISE,
			1001 * TILE_SPAN + NOISE,
			1001 * TILE_SPAN + NOISE,
		];

		expect( collectTiles( range, LEVEL, scheme ) ).toEqual( [[ 1000, 1000, LEVEL ]] );

	} );

	it( 'should include a deep-level tile that the range overhangs by less than a fixed epsilon.', () => {

		// The range covers one tile fully and extends a hair past the shared boundary into the
		// next tile. The neighboring tile must be included, otherwise a composed texture is
		// left with uncovered, transparent pixels at the tile edge.
		const OVERHANG = 5e-9;
		const range = [
			1000 * TILE_SPAN,
			1000 * TILE_SPAN,
			1001 * TILE_SPAN + OVERHANG,
			1001 * TILE_SPAN,
		];

		const tiles = collectTiles( range, LEVEL, scheme );
		expect( tiles ).toContainEqual( [ 1000, 1000, LEVEL ] );
		expect( tiles ).toContainEqual( [ 1001, 1000, LEVEL ] );

	} );

	it( 'should not include neighboring tiles when the range aligns to tile boundaries.', () => {

		const range = [
			1000 * TILE_SPAN,
			1000 * TILE_SPAN,
			1002 * TILE_SPAN,
			1001 * TILE_SPAN,
		];

		expect( collectTiles( range, LEVEL, scheme ) ).toEqual( [
			[ 1000, 1000, LEVEL ],
			[ 1001, 1000, LEVEL ],
		] );

	} );

} );
