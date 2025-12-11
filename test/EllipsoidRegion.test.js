import { Vector3, MathUtils, Matrix4, Box3, Sphere } from 'three';
import { EllipsoidRegion } from '../src/three/renderer/math/EllipsoidRegion.js';
import { WGS84_ELLIPSOID } from '../src/three/renderer/math/GeoConstants.js';

describe( 'EllipsoidRegion', () => {

	describe( 'WGS84 ellipsoid regions', () => {

		it( 'should handle real-world WGS84 regions.', () => {

			const sphere = new Sphere();
			const box = new Box3();
			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const point = new Vector3();

			// Test a region over Tokyo
			const region = new EllipsoidRegion();
			region.radius.copy( WGS84_ELLIPSOID.radius );

			region.latStart = 35.5 * MathUtils.DEG2RAD;
			region.latEnd = 35.8 * MathUtils.DEG2RAD;
			region.lonStart = 139.5 * MathUtils.DEG2RAD;
			region.lonEnd = 139.9 * MathUtils.DEG2RAD;
			region.heightStart = 0;
			region.heightEnd = 0.1;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// test grid of points
			for ( let latStep = 0; latStep <= 5; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 5, region.latStart, region.latEnd );
				for ( let lonStep = 0; lonStep <= 5; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 5, region.lonStart, region.lonEnd );
					for ( const height of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, height, point );

						// sphere containment
						expect( sphere.containsPoint( point ) ).toBe( true );

						// box containment
						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

	} );

	describe( 'Edge cases', () => {

		// Comprehensive ellipsoid shape test configurations
		const ellipsoidConfigs = [
			// spheres
			{ x: 0.5, y: 0.5, z: 0.5, name: 'small sphere (0.5)' },
			{ x: 1.0, y: 1.0, z: 1.0, name: 'unit sphere (1.0)' },
			{ x: 2.0, y: 2.0, z: 2.0, name: 'large sphere (2.0)' },

			// oblate (flattened on z)
			{ x: 1.0, y: 1.0, z: 0.8, name: 'oblate slight (1.0, 1.0, 0.8)' },
			{ x: 2.0, y: 2.0, z: 1.5, name: 'oblate moderate (2.0, 2.0, 1.5)' },
			{ x: 1.5, y: 1.5, z: 1.0, name: 'oblate strong (1.5, 1.5, 1.0)' },

			// prolate (elongated on z)
			{ x: 0.8, y: 0.8, z: 1.0, name: 'prolate slight (0.8, 0.8, 1.0)' },
			{ x: 1.0, y: 1.0, z: 1.5, name: 'prolate moderate (1.0, 1.0, 1.5)' },
			{ x: 1.0, y: 1.0, z: 2.0, name: 'prolate strong (1.0, 1.0, 2.0)' },

			// triaxial (all axes different)
			// { x: 1.0, y: 1.2, z: 0.9, name: 'triaxial (1.0, 1.2, 0.9)' },
			// { x: 2.0, y: 1.5, z: 1.0, name: 'triaxial (2.0, 1.5, 1.0)' },
			// { x: 1.5, y: 1.0, z: 1.3, name: 'triaxial (1.5, 1.0, 1.3)' },
		];

		// Region configurations covering various cases
		const regionConfigs = [
			// small
			{ latStart: 0, latEnd: 0.2, lonStart: 0, lonEnd: 0.3, heightStart: 0, heightEnd: 0.05, name: 'small northern region' },
			{ latStart: - 0.3, latEnd: - 0.1, lonStart: 1.0, lonEnd: 1.4, heightStart: - 0.05, heightEnd: 0, name: 'small southern region' },

			// mid-size
			{ latStart: - Math.PI / 6, latEnd: Math.PI / 6, lonStart: 0, lonEnd: Math.PI / 3, heightStart: - 0.1, heightEnd: 0.1, name: 'mid-size equatorial' },
			{ latStart: 0, latEnd: Math.PI / 4, lonStart: Math.PI, lonEnd: Math.PI * 1.3, heightStart: 0, heightEnd: 0.15, name: 'mid-size with wide longitude' },

			// equator-crossing
			{ latStart: - Math.PI / 4, latEnd: Math.PI / 4, lonStart: 0, lonEnd: Math.PI / 2, heightStart: - 0.05, heightEnd: 0.1, name: 'equator-crossing' },

			// polar
			{ latStart: Math.PI / 3, latEnd: Math.PI / 2, lonStart: 0, lonEnd: Math.PI / 4, heightStart: 0, heightEnd: 0.08, name: 'north polar' },
			{ latStart: - Math.PI / 2, latEnd: - Math.PI / 3, lonStart: Math.PI / 2, lonEnd: Math.PI, heightStart: - 0.05, heightEnd: 0.05, name: 'south polar' },

			// > PI longitude
			{ latStart: - Math.PI / 8, latEnd: Math.PI / 8, lonStart: 0, lonEnd: Math.PI * 1.3, heightStart: 0, heightEnd: 0.1, name: 'wide longitude 1.3*PI' },
			{ latStart: 0, latEnd: Math.PI / 3, lonStart: 0.5, lonEnd: Math.PI * 1.7 + 0.5, heightStart: - 0.1, heightEnd: 0, name: 'wide longitude 1.7*PI' },

			// large latitude span
			{ latStart: - Math.PI / 2, latEnd: Math.PI / 2, lonStart: 0, lonEnd: Math.PI / 4, heightStart: 0, heightEnd: 0.05, name: 'full latitude span' },
		];

		ellipsoidConfigs.forEach( ellipsoidConfig => {

			regionConfigs.forEach( regionConfig => {

				it( `should handle ${ellipsoidConfig.name} with ${regionConfig.name}`, () => {

					const matrix = new Matrix4();
					const invMatrix = new Matrix4();
					const box = new Box3();
					const sphere = new Sphere();
					const point = new Vector3();

					const region = new EllipsoidRegion( ellipsoidConfig.x, ellipsoidConfig.y, ellipsoidConfig.z );
					region.latStart = regionConfig.latStart;
					region.latEnd = regionConfig.latEnd;
					region.lonStart = regionConfig.lonStart;
					region.lonEnd = regionConfig.lonEnd;
					region.heightStart = regionConfig.heightStart;
					region.heightEnd = regionConfig.heightEnd;

					// get bounds
					region.getBoundingBox( box, matrix );
					region.getBoundingSphere( sphere );
					invMatrix.copy( matrix ).invert();

					const LAT_STEPS = 5;
					const LON_STEPS = 10;
					const HEIGHT_STEPS = 2;

					// test 100+ points distributed across the region
					for ( let latStep = 0; latStep <= LAT_STEPS; latStep ++ ) {

						const lat = MathUtils.mapLinear( latStep, 0, LAT_STEPS, region.latStart, region.latEnd );
						for ( let lonStep = 0; lonStep <= LON_STEPS; lonStep ++ ) {

							const lon = MathUtils.mapLinear( lonStep, 0, LON_STEPS, region.lonStart, region.lonEnd );
							for ( let heightStep = 0; heightStep <= HEIGHT_STEPS; heightStep ++ ) {

								const height = MathUtils.mapLinear( heightStep, 0, HEIGHT_STEPS, region.heightStart, region.heightEnd );
								region.getCartographicToPosition( lat, lon, height, point );


								// sphere containment
								expect( sphere.containsPoint( point ) ).toBe( true );

								// box containment
								point.applyMatrix4( invMatrix );
								expect( box.containsPoint( point ) ).toBe( true );

							}

						}

					}

				} );

			} );

		} );

		it( 'should handle zero-height regions.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = 0;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI / 4;
			region.heightStart = 0;
			region.heightEnd = 0;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// Test surface points
			for ( let latStep = 0; latStep <= 5; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 5, region.latStart, region.latEnd );
				for ( let lonStep = 0; lonStep <= 5; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 5, region.lonStart, region.lonEnd );
					region.getCartographicToPosition( lat, lon, 0, point );

					// sphere containment
					expect( sphere.containsPoint( point ) ).toBe( true );

					// box containment
					point.applyMatrix4( invMatrix );
					expect( box.containsPoint( point ) ).toBe( true );

				}

			}

		} );

	} );

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
