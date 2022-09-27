import * as Cesium from 'cesium';
import { Vector3, MathUtils, Matrix4, Box3, Sphere } from 'three';
import { EllipsoidRegion } from '../src/three/math/EllipsoidRegion.js';
import { Ellipsoid } from '../src/three/math/Ellipsoid.js';
import { WGS84_HEIGHT, WGS84_RADIUS } from '../src/base/constants.js';

function compareCartesianVector( cart, vec, EPSILON = 1e-13 ) {

	expect( Math.abs( cart.x - vec.x ) ).toBeLessThanOrEqual( EPSILON );
	expect( Math.abs( cart.y - vec.y ) ).toBeLessThanOrEqual( EPSILON );
	expect( Math.abs( cart.z - vec.z ) ).toBeLessThanOrEqual( EPSILON );

}

describe( 'Ellipsoid', () => {

	let v, c;
	let c_unitEllipse, unitEllipse;
	let c_wgsEllipse, wgsEllipse;
	let norm, norm2, cnorm, cnorm2;
	beforeEach( () => {

		c = new Cesium.Cartesian3();
		v = new Vector3();

		norm = new Vector3();
		norm2 = new Vector3();
		cnorm = new Cesium.Cartesian3();
		cnorm2 = new Cesium.Cartesian3();

		c_unitEllipse = new Cesium.Ellipsoid( 1, 1, 1 );
		unitEllipse = new Ellipsoid( 1, 1, 1 );

		c_wgsEllipse = new Cesium.Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
		wgsEllipse = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );

	} );

	it( 'should match Cesium Unit Sphere results.', () => {

		for ( let i = 0; i < 100; i ++ ) {

			const lat = Math.random();
			const lon = Math.random();
			const height = Math.random();
			const cart = new Cesium.Cartographic( lon, lat, 0 );

			// test positions
			c_unitEllipse.cartographicToCartesian( new Cesium.Cartographic( lon, lat, height ), c );
			unitEllipse.getCartographicToPosition( lat, lon, height, v );

			compareCartesianVector( c, v );

			// test normals
			c_unitEllipse.geodeticSurfaceNormal( c, cnorm2 );
			c_unitEllipse.geodeticSurfaceNormalCartographic( cart, cnorm );
			unitEllipse.getPositionToNormal( v, norm );

			compareCartesianVector( cnorm, norm );
			compareCartesianVector( cnorm, cnorm2 );

		}

	} );

	it( 'should match Cesium WGS84 results.', () => {

		const LOCAL_EPSILON = 1e-6;
		for ( let i = 0; i < 100; i ++ ) {

			const lat = Math.random();
			const lon = Math.random();
			const height = ( Math.random() - 0.5 ) * 1000;

			const cart = new Cesium.Cartographic( lon, lat, 0 );

			// test positions
			c_wgsEllipse.cartographicToCartesian( new Cesium.Cartographic( lon, lat, height ), c );
			wgsEllipse.getCartographicToPosition( lat, lon, height, v );

			compareCartesianVector( c, v, LOCAL_EPSILON );

			// test normals
			c_wgsEllipse.geodeticSurfaceNormal( c, cnorm2 );
			c_wgsEllipse.geodeticSurfaceNormalCartographic( cart, cnorm );
			wgsEllipse.getPositionToNormal( v, norm );
			wgsEllipse.getCartographicToNormal( lat, lon, norm2 );

			compareCartesianVector( cnorm, norm, LOCAL_EPSILON );
			compareCartesianVector( cnorm, cnorm2, LOCAL_EPSILON );
			compareCartesianVector( cnorm, norm2, LOCAL_EPSILON );

		}

	} );

} );

describe( 'EllipsoidRegion', () => {

	describe( 'Bounding Boxes', () => {

		it( 'should encapsulate randomized points.', () => {

			const POINT_COUNT = 100;
			const REGION_COUNT = 100;
			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();
			for ( let i = 0; i < REGION_COUNT; i ++ ) {

				const region = new EllipsoidRegion( 1, 1, 1 );
				region.heightStart = MathUtils.mapLinear( Math.random(), 0, 1, - 0.2, 0.2 );
				region.heightEnd = region.heightStart + MathUtils.mapLinear( Math.random(), 0, 1, 0, 0.2 );

				region.latStart = MathUtils.mapLinear( Math.random(), 0, 1, - Math.PI / 2, 0 );
				region.latEnd = MathUtils.mapLinear( Math.random(), 0, 1, 0, Math.PI / 2 );

				region.lonStart = MathUtils.mapLinear( Math.random(), 0, 1, 0.0, 2 * Math.PI );
				region.lonEnd = region.lonStart + MathUtils.mapLinear( Math.random(), 0, 1, 0, Math.PI );

				region.getBoundingBox( box, matrix );
				region.getBoundingSphere( sphere );
				invMatrix.copy( matrix ).invert();

				for ( let p = 0; p < POINT_COUNT; p ++ ) {

					region.getCartographicToPosition(
						MathUtils.mapLinear( Math.random(), 0, 1, region.latStart, region.latEnd ),
						MathUtils.mapLinear( Math.random(), 0, 1, region.lonStart, region.lonEnd ),
						Math.random() > 0.5 ? region.heightStart : region.heightEnd,
						point,
					);


					expect( sphere.containsPoint( point ) ).toBe( true );
					point.applyMatrix4( invMatrix );
					// if ( ! box.containsPoint( point ) ) {

					// 	console.log( `
					// 		p.position.set( ${ point.x }, ${ point.y }, ${ point.z } );
					// 		er.latStart = ${ region.latStart };
					// 		er.latEnd = ${ region.latEnd };
					// 		er.lonStart = ${ region.lonStart };
					// 		er.lonEnd = ${ region.lonEnd };
					// 		er.heightStart = ${ region.heightStart };
					// 		er.heightEnd = ${ region.heightEnd };

					// 	`);

					// }
					expect( box.containsPoint( point ) ).toBe( true );

				}

			}

		} );

	} );

} );
