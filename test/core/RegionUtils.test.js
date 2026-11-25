import { Box3, Matrix4, Vector3 } from 'three';
import { EllipsoidRegion } from '../../src/three/renderer/math/EllipsoidRegion.js';
import { regionToBox } from '../../src/core/renderer/utilities/RegionUtils.js';
import { WGS84_HEIGHT, WGS84_RADIUS } from '../../src/core/renderer/constants.js';

const WGS84_RADII = [ WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT ];
const DEG = Math.PI / 180;

// the box of a region computed by the three.js EllipsoidRegion, in the 12 number box layout
function getThreeBox( radii, region ) {

	const [ west, south, east, north, minHeight, maxHeight ] = region;
	const ellipsoidRegion = new EllipsoidRegion( ...radii, south, north, west, east, minHeight, maxHeight );

	const box = new Box3();
	const matrix = new Matrix4();
	ellipsoidRegion.getBoundingBox( box, matrix );

	const center = new Vector3().setFromMatrixPosition( matrix );
	const x = new Vector3();
	const y = new Vector3();
	const z = new Vector3();
	matrix.extractBasis( x, y, z );

	return [
		...center.toArray(),
		...x.multiplyScalar( box.max.x ).toArray(),
		...y.multiplyScalar( box.max.y ).toArray(),
		...z.multiplyScalar( box.max.z ).toArray(),
	];

}

// the largest difference between the boxes, relative to the size of the ellipsoid
function getDifference( radii, region ) {

	const box = regionToBox( region, radii );
	const expected = getThreeBox( radii, region );
	const scale = Math.max( ...radii ) + Math.abs( region[ 5 ] );

	let difference = 0;
	for ( let i = 0; i < 12; i ++ ) {

		difference = Math.max( difference, Math.abs( box[ i ] - expected[ i ] ) / scale );

	}

	return difference;

}

// a seeded pseudo random number generator, for repeatable random regions
function createRandom( seed ) {

	return () => {

		seed = ( seed * 16807 ) % 2147483647;
		return seed / 2147483647;

	};

}

describe( 'regionToBox', () => {

	it( 'matches the three.js EllipsoidRegion for real-world WGS84 regions', () => {

		const regions = [
			// Helsinki city center
			[ 24.90 * DEG, 60.15 * DEG, 24.98 * DEG, 60.19 * DEG, - 10, 150 ],
			// a region crossing the equator and the antimeridian
			[ 179.5 * DEG, - 0.5 * DEG, 180.5 * DEG, 0.5 * DEG, 0, 1000 ],
			// a region in the southern hemisphere
			[ - 70 * DEG, - 34 * DEG, - 69 * DEG, - 33 * DEG, 0, 6000 ],
			// a region touching the north pole
			[ 0, 89 * DEG, 10 * DEG, 90 * DEG, 0, 100 ],
			// the whole globe, wider than 180 degrees of longitude
			[ - Math.PI, - Math.PI / 2, Math.PI, Math.PI / 2, - 100, 9000 ],
			// a zero height region
			[ 2 * DEG, 48 * DEG, 3 * DEG, 49 * DEG, 0, 0 ],
		];

		for ( const region of regions ) {

			expect( getDifference( WGS84_RADII, region ) ).toBeLessThan( 1e-14 );

		}

	} );

	it( 'matches the three.js EllipsoidRegion for random regions and ellipsoids', () => {

		const random = createRandom( 1 );
		const radiiSet = [ WGS84_RADII, [ 1, 1, 1 ], [ 1737400, 1737400, 1737400 ]];
		for ( const radii of radiiSet ) {

			for ( let i = 0; i < 300; i ++ ) {

				// every fourth region is wider than 180 degrees of longitude
				const west = random() * 2 * Math.PI - Math.PI;
				const width = i % 4 === 0 ? Math.PI + random() * Math.PI : 1e-5 + random() * 1.2;
				const south = random() * Math.PI - Math.PI / 2;
				const north = Math.min( Math.PI / 2, south + 1e-5 + random() * 0.8 );
				// heights in proportion to the ellipsoid, as a region below its center has no shape
				const minHeight = radii[ 0 ] * ( - 1e-5 + random() * 1e-4 );
				const maxHeight = minHeight + radii[ 0 ] * random() * 3e-4;

				const region = [ west, south, west + width, north, minHeight, maxHeight ];
				expect( getDifference( radii, region ) ).toBeLessThan( 1e-12 );

			}

		}

	} );

	it( 'writes the box into the target array', () => {

		const target = new Array( 12 ).fill( 0 );
		const result = regionToBox( [ 0.4, 0.9, 0.401, 0.901, 0, 100 ], WGS84_RADII, target );

		expect( result ).toBe( target );
		expect( target.every( value => Number.isFinite( value ) ) ).toBe( true );

	} );

	it( 'warns for triaxial ellipsoids', () => {

		const warn = vi.spyOn( console, 'warn' ).mockImplementation( () => {} );
		regionToBox( [ 0, 0, 0.1, 0.1, 0, 0 ], [ 3, 2, 1 ] );

		expect( warn ).toHaveBeenCalledTimes( 1 );
		warn.mockRestore();

	} );

} );
