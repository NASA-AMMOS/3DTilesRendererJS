import { decodeOctNormal } from '../../src/three/renderer/loaders/decodeOctNormal';

const PRECISION = 0.005;

describe( 'decodeOctNormal', () => {

	it.each( [
		// 4 corners of the projected octahedron
		[ 0, 0, 0, 0, - 1 ],
		[ 255, 255, 0, 0, - 1 ],
		[ 0, 255, 0, 0, - 1 ],
		[ 255, 0, 0, 0, - 1 ],

		// Center of the projected octahedron
		[ 127, 127, 0, 0, 1 ],

		// Midpoint of left edge of the projected octahedron
		[ 0, 127, - 1, 0, 0 ],

		// Midpoint of right edge of the projected octahedron
		[ 255, 127, 1, 0, 0 ],

		// Midpoint of top edge of the projected octahedron
		[ 127, 255, 0, 1, 0 ],

		// Midpoint of bottom edge of the projected octahedron
		[ 127, 0, 0, - 1, 0 ],
	] )( 'should decode (%s, %s) into [%s, %s, %s]', ( encX, encY, x, y, z ) => {

		const result = decodeOctNormal( encX, encY );

		expect( result.length() ).toBeCloseTo( 1, PRECISION );
		expect( result.x ).toBeCloseTo( x, PRECISION );
		expect( result.y ).toBeCloseTo( y, PRECISION );
		expect( result.z ).toBeCloseTo( z, PRECISION );

	} );

} );

describe( 'decodeOctNormal range', () => {

	// 8-bit values map to [ - 1, 1 ] by dividing by 255 so the maximum
	// encoded value must land exactly on the octahedron edge.
	it( 'should map the corner of the octahedron exactly to - Z', () => {

		const result = decodeOctNormal( 255, 255 );
		expect( result.x ).toBeCloseTo( 0, 4 );
		expect( result.y ).toBeCloseTo( 0, 4 );
		expect( result.z ).toBeCloseTo( - 1, 4 );

	} );

	it( 'should map the maximum encoded values to the axis aligned edge normals', () => {

		const right = decodeOctNormal( 255, 127.5 );
		expect( right.x ).toBeCloseTo( 1, 4 );
		expect( right.y ).toBeCloseTo( 0, 4 );
		expect( right.z ).toBeCloseTo( 0, 4 );

		const top = decodeOctNormal( 127.5, 255 );
		expect( top.x ).toBeCloseTo( 0, 4 );
		expect( top.y ).toBeCloseTo( 1, 4 );
		expect( top.z ).toBeCloseTo( 0, 4 );

	} );

} );
