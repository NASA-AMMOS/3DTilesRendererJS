import { Vector3, MathUtils, Matrix4, Box3, Sphere } from 'three';
import { EllipsoidRegion } from '../src/three/renderer/math/EllipsoidRegion.js';
import { WGS84_ELLIPSOID } from '../src/three/renderer/math/GeoConstants.js';

describe( 'EllipsoidRegion', () => {

	describe( 'getBoundingSphere', () => {

		it( 'should use provided center when given.', () => {

			const sphere = new Sphere();
			const customCenter = new Vector3( 1, 2, 3 );
			const region = new EllipsoidRegion( 1, 1, 1 );

			region.getBoundingSphere( sphere, customCenter );

			expect( sphere.center.x ).toBe( 1 );
			expect( sphere.center.y ).toBe( 2 );
			expect( sphere.center.z ).toBe( 3 );

		} );

		it( 'should compute center when not provided.', () => {

			const sphere = new Sphere();
			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = 0;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI / 4;

			region.getBoundingSphere( sphere );

			// Center should be computed, not at origin
			expect( sphere.center.lengthSq() ).toBeGreaterThan( 0 );

		} );

	} );

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

			// Test a grid of points
			for ( let latStep = 0; latStep <= 5; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 5, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 5; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 5, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );

						// Test sphere containment
						expect( sphere.containsPoint( point ) ).toBe( true );

						// Test box containment
						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

	} );

	describe( 'Edge cases', () => {

		it( 'should handle many combinations of ellipsoid shapes and region configurations.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			// Comprehensive ellipsoid shape test configurations
			const ellipsoidConfigs = [
				// Spheres
				{ x: 0.5, y: 0.5, z: 0.5, name: 'Small sphere' },
				{ x: 1.0, y: 1.0, z: 1.0, name: 'Unit sphere' },
				{ x: 2.0, y: 2.0, z: 2.0, name: 'Large sphere' },
				// Oblate (flattened at poles, like Earth)
				{ x: 1.0, y: 1.0, z: 0.8, name: 'Oblate (slight)' },
				{ x: 2.0, y: 2.0, z: 1.5, name: 'Oblate (moderate)' },
				{ x: 1.5, y: 1.5, z: 1.0, name: 'Oblate (strong)' },
				// Prolate (elongated at poles)
				{ x: 0.8, y: 0.8, z: 1.0, name: 'Prolate (slight)' },
				{ x: 1.0, y: 1.0, z: 1.5, name: 'Prolate (moderate)' },
				{ x: 1.0, y: 1.0, z: 2.0, name: 'Prolate (strong)' },
				// Triaxial (all axes different)
				{ x: 1.0, y: 1.2, z: 0.9, name: 'Triaxial (type 1)' },
				{ x: 2.0, y: 1.5, z: 1.0, name: 'Triaxial (type 2)' },
				{ x: 1.5, y: 1.0, z: 1.3, name: 'Triaxial (type 3)' },
			];

			// Region configurations covering various cases
			const regionConfigs = [
				// Small regions
				{ latStart: 0, latEnd: 0.2, lonStart: 0, lonEnd: 0.3, heightStart: 0, heightEnd: 0.05 },
				{ latStart: - 0.3, latEnd: - 0.1, lonStart: 1.0, lonEnd: 1.4, heightStart: - 0.05, heightEnd: 0 },
				// Mid-size regions
				{ latStart: - Math.PI / 6, latEnd: Math.PI / 6, lonStart: 0, lonEnd: Math.PI / 3, heightStart: - 0.1, heightEnd: 0.1 },
				{ latStart: 0, latEnd: Math.PI / 4, lonStart: Math.PI, lonEnd: Math.PI * 1.3, heightStart: 0, heightEnd: 0.15 },
				// Equator-crossing
				{ latStart: - Math.PI / 4, latEnd: Math.PI / 4, lonStart: 0, lonEnd: Math.PI / 2, heightStart: - 0.05, heightEnd: 0.1 },
				// Polar regions
				{ latStart: Math.PI / 3, latEnd: Math.PI / 2, lonStart: 0, lonEnd: Math.PI / 4, heightStart: 0, heightEnd: 0.08 },
				{ latStart: - Math.PI / 2, latEnd: - Math.PI / 3, lonStart: Math.PI / 2, lonEnd: Math.PI, heightStart: - 0.05, heightEnd: 0.05 },
				// Wide longitude (> PI)
				{ latStart: - Math.PI / 8, latEnd: Math.PI / 8, lonStart: 0, lonEnd: Math.PI * 1.3, heightStart: 0, heightEnd: 0.1 },
				{ latStart: 0, latEnd: Math.PI / 3, lonStart: 0.5, lonEnd: Math.PI * 1.7 + 0.5, heightStart: - 0.1, heightEnd: 0 },
				// Large latitude span
				{ latStart: - Math.PI / 2, latEnd: Math.PI / 2, lonStart: 0, lonEnd: Math.PI / 4, heightStart: 0, heightEnd: 0.05 },
			];

			// Test each ellipsoid shape with each region configuration
			ellipsoidConfigs.forEach( ( ellipsoidConfig ) => {

				regionConfigs.forEach( ( regionConfig ) => {

					const region = new EllipsoidRegion( ellipsoidConfig.x, ellipsoidConfig.y, ellipsoidConfig.z );
					region.latStart = regionConfig.latStart;
					region.latEnd = regionConfig.latEnd;
					region.lonStart = regionConfig.lonStart;
					region.lonEnd = regionConfig.lonEnd;
					region.heightStart = regionConfig.heightStart;
					region.heightEnd = regionConfig.heightEnd;

					region.getBoundingBox( box, matrix );
					region.getBoundingSphere( sphere );
					invMatrix.copy( matrix ).invert();

					// Test 100+ points distributed across the region
					const LAT_STEPS = 5;
					const LON_STEPS = 10;
					const HEIGHT_STEPS = 2;
					// Total points per region: 5 * 10 * 2 = 100 points

					for ( let latStep = 0; latStep <= LAT_STEPS; latStep ++ ) {

						const lat = MathUtils.mapLinear( latStep, 0, LAT_STEPS, region.latStart, region.latEnd );

						for ( let lonStep = 0; lonStep <= LON_STEPS; lonStep ++ ) {

							const lon = MathUtils.mapLinear( lonStep, 0, LON_STEPS, region.lonStart, region.lonEnd );

							for ( let heightStep = 0; heightStep <= HEIGHT_STEPS; heightStep ++ ) {

								const height = MathUtils.mapLinear( heightStep, 0, HEIGHT_STEPS, region.heightStart, region.heightEnd );

								region.getCartographicToPosition( lat, lon, height, point );

								// Test sphere containment
								expect( sphere.containsPoint( point ) ).toBe( true );

								// Test box containment
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

					expect( sphere.containsPoint( point ) ).toBe( true );

					point.applyMatrix4( invMatrix );
					expect( box.containsPoint( point ) ).toBe( true );

				}

			}

		} );

	} );

} );
