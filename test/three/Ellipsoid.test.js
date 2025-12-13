/* eslint-disable vitest/expect-expect */
import * as Cesium from 'cesium';
import { Vector3, MathUtils, Matrix4 } from 'three';
import { Ellipsoid } from '../../src/three/renderer/math/Ellipsoid.js';
import { WGS84_HEIGHT, WGS84_RADIUS } from '../../src/core/renderer/constants.js';
import { WGS84_ELLIPSOID } from '../../src/three/renderer/math/GeoConstants.js';

function epsCompare( a, b, EPSILON = 1e-10 ) {

	expect( Math.abs( a - b ) ).toBeLessThanOrEqual( EPSILON );

}

function compareCartesianVector( cart, vec, EPSILON = 1e-10 ) {

	epsCompare( cart.x, vec.x, EPSILON );
	epsCompare( cart.y, vec.y, EPSILON );
	epsCompare( cart.z, vec.z, EPSILON );

}

function compareCoord( a, b, EPSILON = 1e-7 ) {

	epsCompare( a, b, EPSILON );

}

function randomRange( min, max ) {

	const delta = max - min;
	return min + Math.random() * delta;

}

function randomLat() {

	return randomRange( - Math.PI / 2, Math.PI / 2 );

}

function randomLon() {

	return randomRange( - Math.PI, Math.PI );

}

describe( 'Ellipsoid', () => {

	let v, c, c2;
	let c_unitEllipse, unitEllipse;
	let c_wgsEllipse, wgsEllipse;
	let norm, cnorm;
	beforeEach( () => {

		c = new Cesium.Cartesian3();
		c2 = new Cesium.Cartesian3();
		v = new Vector3();

		norm = new Vector3();
		cnorm = new Cesium.Cartesian3();

		c_unitEllipse = new Cesium.Ellipsoid( 1, 1, 1 );
		unitEllipse = new Ellipsoid( 1, 1, 1 );

		c_wgsEllipse = new Cesium.Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
		wgsEllipse = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );

	} );

	it( 'should convert between lat lon and position consistently.', () => {

		const POS_EPSILON = 1e-6;
		const SURF_EPSILON = 1e-5;
		const LAT_LON_EPSILON = 1e-4;
		for ( let i = 0; i < 100; i ++ ) {

			const lat = randomLat();
			const lon = randomLon();
			const height = randomRange( - 1e5, 1e5 );
			const cart = new Cesium.Cartographic( lon, lat, height );

			wgsEllipse.getCartographicToPosition( lat, lon, height, v );
			c_wgsEllipse.cartographicToCartesian( cart, c );

			compareCartesianVector( c, v, POS_EPSILON );

			const result = {};
			wgsEllipse.getPositionToCartographic( v, result );
			c_wgsEllipse.scaleToGeodeticSurface( c, c2 );

			compareCoord( result.lat, lat, LAT_LON_EPSILON );
			compareCoord( result.lon, lon, LAT_LON_EPSILON );
			compareCoord( result.height, height, SURF_EPSILON );

		}

	} );

	it( 'should match the surface points.', () => {

		const LOCAL_EPSILON = 1e-8;
		for ( let i = 0; i < 100; i ++ ) {

			v.random().normalize().multiplyScalar( WGS84_RADIUS * 2 );
			c.x = v.x;
			c.y = v.y;
			c.z = v.z;

			wgsEllipse.getPositionToSurfacePoint( v, norm );
			c_wgsEllipse.scaleToGeodeticSurface( c, cnorm );

			compareCartesianVector( cnorm, norm, LOCAL_EPSILON );

		}

	} );

	it( 'should match Cesium Unit Sphere results.', () => {

		for ( let i = 0; i < 100; i ++ ) {

			const lat = randomLat();
			const lon = randomLon();
			const height = randomRange( - 1e5, 1e5 );
			const cart = new Cesium.Cartographic( lon, lat, height );

			// test positions
			c_unitEllipse.cartographicToCartesian( cart, c );
			unitEllipse.getCartographicToPosition( lat, lon, height, v );

			compareCartesianVector( c, v );

			// test pos to normal
			c_unitEllipse.geodeticSurfaceNormal( c, cnorm );
			unitEllipse.getPositionToNormal( v, norm );

			compareCartesianVector( cnorm, norm );

			// test cart to normal
			c_wgsEllipse.geodeticSurfaceNormalCartographic( cart, cnorm );
			wgsEllipse.getCartographicToNormal( lat, lon, norm );

			compareCartesianVector( cnorm, norm );

		}

	} );

	it( 'should match Cesium WGS84 results.', () => {

		const LOCAL_EPSILON = 1e-6;
		for ( let i = 0; i < 100; i ++ ) {

			const lat = randomLat();
			const lon = randomLon();
			const height = randomRange( - 1e5, 1e5 );
			const cart = new Cesium.Cartographic( lon, lat, 0 );

			// test positions
			c_wgsEllipse.cartographicToCartesian( new Cesium.Cartographic( lon, lat, height ), c );
			wgsEllipse.getCartographicToPosition( lat, lon, height, v );

			compareCartesianVector( c, v, LOCAL_EPSILON );

			// test pos to normal
			c_unitEllipse.geodeticSurfaceNormal( c, cnorm );
			unitEllipse.getPositionToNormal( v, norm );

			compareCartesianVector( cnorm, norm );

			// test cart to normal
			c_wgsEllipse.geodeticSurfaceNormalCartographic( cart, cnorm );
			wgsEllipse.getCartographicToNormal( lat, lon, norm );

			compareCartesianVector( cnorm, norm );

		}

	} );

	it( 'should match the expected elevation.', () => {

		//ellipsoid rotation
		const northPos = new Vector3( 0, 0, WGS84_HEIGHT );
		expect( wgsEllipse.getPositionElevation( northPos ) ).toBeCloseTo( 0, 1e-6 );
		const southPos = new Vector3( 0, 0, - WGS84_HEIGHT );
		expect( wgsEllipse.getPositionElevation( southPos ) ).toBeCloseTo( 0, 1e-6 );
		const xPos = new Vector3( WGS84_RADIUS, 0, 0 );
		expect( wgsEllipse.getPositionElevation( xPos ) ).toBeCloseTo( 0, 1e-6 );
		const mxPos = new Vector3( - WGS84_RADIUS, 0, 0 );
		expect( wgsEllipse.getPositionElevation( mxPos ) ).toBeCloseTo( 0, 1e-6 );
		const zPos = new Vector3( 0, WGS84_RADIUS, 0 );
		expect( wgsEllipse.getPositionElevation( zPos ) ).toBeCloseTo( 0, 1e-6 );
		const mzPos = new Vector3( 0, - WGS84_RADIUS, 0 );
		expect( wgsEllipse.getPositionElevation( mzPos ) ).toBeCloseTo( 0, 1e-6 );

		const northPos100 = new Vector3( 0, 0, WGS84_HEIGHT + 100 );
		expect( wgsEllipse.getPositionElevation( northPos100 ) ).toBeCloseTo( 100, 1e-6 );
		const southPos100 = new Vector3( 0, 0, - WGS84_HEIGHT - 100 );
		expect( wgsEllipse.getPositionElevation( southPos100 ) ).toBeCloseTo( 100, 1e-6 );
		const xPos100 = new Vector3( WGS84_RADIUS + 100, 0, 0 );
		expect( wgsEllipse.getPositionElevation( xPos100 ) ).toBeCloseTo( 100, 1e-6 );
		const mxPos100 = new Vector3( - WGS84_RADIUS - 100, 0, 0 );
		expect( wgsEllipse.getPositionElevation( mxPos100 ) ).toBeCloseTo( 100, 1e-6 );
		const zPos100 = new Vector3( 0, WGS84_RADIUS + 100, 0 );
		expect( wgsEllipse.getPositionElevation( zPos100 ) ).toBeCloseTo( 100, 1e-6 );
		const mzPos100 = new Vector3( 0, - WGS84_RADIUS - 100, 0 );
		expect( wgsEllipse.getPositionElevation( mzPos100 ) ).toBeCloseTo( 100, 1e-6 );

	} );

} );

describe( 'Ellipsoid Azimuth Elevation', () => {

	it( 'should produce the same values when retrieving data.', () => {

		const mat = new Matrix4();
		const LAT = 35.6586 * MathUtils.DEG2RAD;
		const LON = 139.7454 * MathUtils.DEG2RAD;
		const angles = 25 * MathUtils.DEG2RAD;
		const res = {};
		WGS84_ELLIPSOID.getObjectFrame( LAT, LON, 0, 0, 0, 0, mat );
		WGS84_ELLIPSOID.getCartographicFromObjectFrame( mat, res );

		expect( res.height ).toBeCloseTo( 0 );
		expect( res.lat ).toBeCloseTo( LAT );
		expect( res.lon ).toBeCloseTo( LON );
		expect( res.elevation ).toBeCloseTo( 0 );
		expect( res.azimuth ).toBeCloseTo( 0 );
		expect( res.roll ).toBeCloseTo( 0 );

		WGS84_ELLIPSOID.getObjectFrame( LAT, LON, 0, angles, angles, angles, mat );
		WGS84_ELLIPSOID.getCartographicFromObjectFrame( mat, res );

		expect( res.height ).toBeCloseTo( 0 );
		expect( res.lat ).toBeCloseTo( LAT );
		expect( res.lon ).toBeCloseTo( LON );
		expect( res.elevation ).toBeCloseTo( angles );
		expect( res.azimuth ).toBeCloseTo( angles );
		expect( res.roll ).toBeCloseTo( angles );

		WGS84_ELLIPSOID.getObjectFrame( LAT, LON, 0, - angles, - angles, - angles, mat );
		WGS84_ELLIPSOID.getCartographicFromObjectFrame( mat, res );

		expect( res.height ).toBeCloseTo( 0 );
		expect( res.lat ).toBeCloseTo( LAT );
		expect( res.lon ).toBeCloseTo( LON );
		expect( res.elevation ).toBeCloseTo( - angles );
		expect( res.azimuth ).toBeCloseTo( - angles );
		expect( res.roll ).toBeCloseTo( - angles );

	} );

} );
