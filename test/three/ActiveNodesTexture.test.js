import {
	ActiveNodesTexture,
	idFromOctantPath,
	octantPathFromImplicitTile,
} from '../../src/three/plugins/pointcloud/ActiveNodesTexture';

describe( 'octantPathFromImplicitTile', () => {

	it( 'returns an empty path for the root.', () => {

		expect( octantPathFromImplicitTile( 0, 0, 0, 0 ) ).toBe( '' );

	} );

	it( 'returns one 4·x + 2·y + z digit per level, from the top.', () => {

		expect( octantPathFromImplicitTile( 1, 1, 0, 0 ) ).toBe( '4' );
		expect( octantPathFromImplicitTile( 1, 0, 1, 1 ) ).toBe( '3' );

		// x = 0b10, y = 0b01, z = 0b11
		expect( octantPathFromImplicitTile( 2, 2, 1, 3 ) ).toBe( '53' );

	} );

	it( 'gives the same ids as potree keys.', () => {

		expect( idFromOctantPath( '' ) ).toBe( 0 );
		expect( idFromOctantPath( '0' ) ).toBe( 1 );
		expect( idFromOctantPath( '53' ) ).toBe( 6 * 8 + 4 );

	} );

} );

describe( 'ActiveNodesTexture', () => {

	it( 'encodes the child masks and first child offsets.', () => {

		const nodes = new ActiveNodesTexture();
		nodes.update( [ '', '2', '0', '23' ] );

		// sorted as "", "0", "2", "23", in a 2x2 texture
		const { data, width } = nodes.texture.image;
		expect( width ).toBe( 2 );
		expect( Array.from( data ) ).toEqual( [
			0b101, 0, 1, 100,
			0, 0, 0, 100,
			0b1000, 0, 1, 100,
			0, 0, 0, 100,
		] );

	} );

	it( 'adds missing ancestors so the tree stays connected.', () => {

		const nodes = new ActiveNodesTexture();
		nodes.update( [ '71' ] );

		const { data } = nodes.texture.image;
		expect( Array.from( data.slice( 0, 12 ) ) ).toEqual( [
			1 << 7, 0, 1, 100,
			1 << 1, 0, 1, 100,
			0, 0, 0, 100,
		] );

	} );

	it( 'reports when the texture is replaced by a larger one.', () => {

		const nodes = new ActiveNodesTexture();
		expect( nodes.update( [] ) ).toBe( false );
		expect( nodes.update( [ '0', '1', '2' ] ) ).toBe( true );
		expect( nodes.update( [ '0' ] ) ).toBe( false );

	} );

} );
