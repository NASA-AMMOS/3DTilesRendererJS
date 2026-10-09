import { Mat4, Quat, Vec3 } from 'playcanvas';
import { OBJECT_FRAME, WGS84_ELLIPSOID } from '../../src/playcanvas/renderer/math/Ellipsoid.js';
import { composeMatrix, createMatrix, invertMatrix, transformPoint } from '../../src/playcanvas/renderer/math/MatrixUtils.js';
import { WGS84_HEIGHT, WGS84_RADIUS } from '../../src/core/renderer/constants.js';

const DEG2RAD = Math.PI / 180;

// Tokyo Tower
const LAT = 35.6586 * DEG2RAD;
const LON = 139.7454 * DEG2RAD;

describe( 'PlayCanvas Ellipsoid', () => {

	it( 'should place the equator and the poles on the axes.', () => {

		const pos = new Vec3();
		WGS84_ELLIPSOID.getCartographicToPosition( 0, 0, 0, pos );
		expect( pos.x ).toBeCloseTo( WGS84_RADIUS, 6 );
		expect( pos.y ).toBeCloseTo( 0, 6 );
		expect( pos.z ).toBeCloseTo( 0, 6 );

		WGS84_ELLIPSOID.getCartographicToPosition( Math.PI / 2, 0, 100, pos );
		expect( pos.x ).toBeCloseTo( 0, 6 );
		expect( pos.z ).toBeCloseTo( WGS84_HEIGHT + 100, 6 );

	} );

	it( 'should convert between cartographic coordinates and positions.', () => {

		const pos = WGS84_ELLIPSOID.getCartographicToPosition( LAT, LON, 123.456, new Vec3() );
		const result = WGS84_ELLIPSOID.getPositionToCartographic( pos, {} );
		expect( result.lat ).toBeCloseTo( LAT, 12 );
		expect( result.lon ).toBeCloseTo( LON, 12 );
		expect( result.height ).toBeCloseTo( 123.456, 6 );

	} );

	it( 'should move a location to the origin with +Y up and +Z north, precisely.', () => {

		const frame = WGS84_ELLIPSOID.getObjectFrame( LAT, LON, 0, 0, 0, 0, createMatrix(), OBJECT_FRAME );
		const toOrigin = invertMatrix( frame, createMatrix() );

		// the location itself, millions of meters from the Earth center, lands at the origin
		// with sub-micrometer error, which 32-bit matrices cannot do
		const point = new Vec3();
		WGS84_ELLIPSOID.getCartographicToPosition( LAT, LON, 0, point );
		transformPoint( toOrigin, point.x, point.y, point.z, point );
		expect( point.length() ).toBeLessThan( 1e-6 );

		// 10 meters up
		WGS84_ELLIPSOID.getCartographicToPosition( LAT, LON, 10, point );
		transformPoint( toOrigin, point.x, point.y, point.z, point );
		expect( point.x ).toBeCloseTo( 0, 6 );
		expect( point.y ).toBeCloseTo( 10, 6 );
		expect( point.z ).toBeCloseTo( 0, 6 );

		// a little to the north is +Z, a little to the east is -X
		WGS84_ELLIPSOID.getCartographicToPosition( LAT + 1e-5, LON, 0, point );
		transformPoint( toOrigin, point.x, point.y, point.z, point );
		expect( point.z ).toBeGreaterThan( 50 );
		expect( Math.abs( point.x ) ).toBeLessThan( 1e-3 );

		WGS84_ELLIPSOID.getCartographicToPosition( LAT, LON + 1e-5, 0, point );
		transformPoint( toOrigin, point.x, point.y, point.z, point );
		expect( point.x ).toBeLessThan( - 50 );
		expect( Math.abs( point.z ) ).toBeLessThan( 1e-3 );

	} );

} );

describe( 'PlayCanvas composeMatrix', () => {

	it( 'should match Mat4.setTRS.', () => {

		const t = [ 1.5, - 2, 3.25 ];
		const q = new Quat().setFromEulerAngles( 30, 45, 60 );
		const s = [ 2, 3, 4 ];

		const expected = new Mat4().setTRS( new Vec3( ...t ), q, new Vec3( ...s ) ).data;
		const result = composeMatrix( t, [ q.x, q.y, q.z, q.w ], s, createMatrix() );
		for ( let i = 0; i < 16; i ++ ) {

			expect( result[ i ] ).toBeCloseTo( expected[ i ], 5 );

		}

	} );

} );
