import { Vector3, MathUtils, Matrix4, Box3, Sphere } from 'three';
import { EllipsoidRegion } from '../src/three/renderer/math/EllipsoidRegion.js';
import { WGS84_ELLIPSOID } from '../src/three/renderer/math/GeoConstants.js';

// Deterministic test configurations for various region types
const TEST_REGIONS = [
	// Small region in northern hemisphere
	{ latStart: 0.1, latEnd: 0.3, lonStart: 0.2, lonEnd: 0.5, heightStart: - 0.05, heightEnd: 0.05 },
	// Small region in southern hemisphere
	{ latStart: - 0.5, latEnd: - 0.2, lonStart: 1.0, lonEnd: 1.5, heightStart: 0, heightEnd: 0.1 },
	// Region crossing equator
	{ latStart: - 0.4, latEnd: 0.4, lonStart: 0, lonEnd: Math.PI / 4, heightStart: - 0.1, heightEnd: 0.1 },
	// Wide region (exactly at PI boundary)
	{ latStart: - Math.PI / 4, latEnd: Math.PI / 4, lonStart: 0, lonEnd: Math.PI, heightStart: - 0.05, heightEnd: 0.15 },
	// Very wide region (> PI, 1.5*PI)
	{ latStart: 0, latEnd: Math.PI / 3, lonStart: 0, lonEnd: Math.PI * 1.5, heightStart: 0, heightEnd: 0.05 },
	// Very wide region (> PI, 1.75*PI)
	{ latStart: - Math.PI / 6, latEnd: Math.PI / 6, lonStart: 0, lonEnd: Math.PI * 1.75, heightStart: - 0.05, heightEnd: 0.05 },
	// Nearly full circle (> PI, 1.9*PI)
	{ latStart: - Math.PI / 4, latEnd: Math.PI / 4, lonStart: 0.1, lonEnd: Math.PI * 1.9 + 0.1, heightStart: 0, heightEnd: 0.1 },
	// Polar region (northern)
	{ latStart: Math.PI / 3, latEnd: Math.PI / 2, lonStart: 0, lonEnd: Math.PI / 2, heightStart: - 0.1, heightEnd: 0 },
	// Polar region (southern) with wide longitude
	{ latStart: - Math.PI / 2, latEnd: - Math.PI / 3, lonStart: Math.PI, lonEnd: Math.PI * 1.5, heightStart: 0, heightEnd: 0.1 },
	// Region with negative heights
	{ latStart: - 0.2, latEnd: 0.2, lonStart: 2.0, lonEnd: 2.5, heightStart: - 0.2, heightEnd: - 0.05 },
	// Full latitude span with wide longitude
	{ latStart: - Math.PI / 2, latEnd: Math.PI / 2, lonStart: 0, lonEnd: Math.PI * 1.3, heightStart: 0, heightEnd: 0.05 },
	// Narrow region
	{ latStart: 0.5, latEnd: 0.52, lonStart: 1.0, lonEnd: 1.05, heightStart: - 0.01, heightEnd: 0.01 },
];

describe( 'EllipsoidRegion', () => {

	describe( 'getBoundingBox', () => {

		it( 'should contain all corner points of the region.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const point = new Vector3();

			TEST_REGIONS.forEach( ( config ) => {

				const region = new EllipsoidRegion( 1, 1, 1 );
				region.latStart = config.latStart;
				region.latEnd = config.latEnd;
				region.lonStart = config.lonStart;
				region.lonEnd = config.lonEnd;
				region.heightStart = config.heightStart;
				region.heightEnd = config.heightEnd;

				region.getBoundingBox( box, matrix );
				invMatrix.copy( matrix ).invert();

				// Test all 8 corner points
				for ( const h of [ region.heightStart, region.heightEnd ] ) {

					for ( const lat of [ region.latStart, region.latEnd ] ) {

						for ( const lon of [ region.lonStart, region.lonEnd ] ) {

							region.getCartographicToPosition( lat, lon, h, point );
							point.applyMatrix4( invMatrix );
							expect( box.containsPoint( point ) ).toBe( true );

						}

					}

				}

			} );

		} );

		it( 'should contain a sweep of points across the region surface.', () => {

			const SWEEP_COUNT = 10;
			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const point = new Vector3();

			TEST_REGIONS.forEach( ( config ) => {

				const region = new EllipsoidRegion( 1, 1, 1 );
				region.latStart = config.latStart;
				region.latEnd = config.latEnd;
				region.lonStart = config.lonStart;
				region.lonEnd = config.lonEnd;
				region.heightStart = config.heightStart;
				region.heightEnd = config.heightEnd;

				region.getBoundingBox( box, matrix );
				invMatrix.copy( matrix ).invert();

				// Sweep through latitude, longitude, and height
				for ( let latStep = 0; latStep <= SWEEP_COUNT; latStep ++ ) {

					const lat = MathUtils.mapLinear( latStep, 0, SWEEP_COUNT, region.latStart, region.latEnd );

					for ( let lonStep = 0; lonStep <= SWEEP_COUNT; lonStep ++ ) {

						const lon = MathUtils.mapLinear( lonStep, 0, SWEEP_COUNT, region.lonStart, region.lonEnd );

						for ( const h of [ region.heightStart, region.heightEnd ] ) {

							region.getCartographicToPosition( lat, lon, h, point );
							point.applyMatrix4( invMatrix );
							expect( box.containsPoint( point ) ).toBe( true );

						}

					}

				}

			} );

		} );

		it( 'should handle regions crossing the equator.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 4;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI / 2;
			region.heightStart = - 0.1;
			region.heightEnd = 0.1;

			region.getBoundingBox( box, matrix );
			invMatrix.copy( matrix ).invert();

			// Test points at the equator
			for ( let lonStep = 0; lonStep <= 10; lonStep ++ ) {

				const lon = MathUtils.mapLinear( lonStep, 0, 10, region.lonStart, region.lonEnd );

				for ( const h of [ region.heightStart, region.heightEnd ] ) {

					region.getCartographicToPosition( 0, lon, h, point );
					point.applyMatrix4( invMatrix );
					expect( box.containsPoint( point ) ).toBe( true );

				}

			}

		} );

		it( 'should handle wide longitude regions (> PI).', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 4;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI * 1.5; // > PI
			region.heightStart = - 0.1;
			region.heightEnd = 0.1;

			region.getBoundingBox( box, matrix );
			invMatrix.copy( matrix ).invert();

			// Test a sweep of points
			for ( let latStep = 0; latStep <= 5; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 5, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 10; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 10, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );
						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

	} );

	describe( 'getBoundingSphere', () => {

		it( 'should contain all corner points of the region.', () => {

			const sphere = new Sphere();
			const point = new Vector3();

			TEST_REGIONS.forEach( ( config ) => {

				const region = new EllipsoidRegion( 1, 1, 1 );
				region.latStart = config.latStart;
				region.latEnd = config.latEnd;
				region.lonStart = config.lonStart;
				region.lonEnd = config.lonEnd;
				region.heightStart = config.heightStart;
				region.heightEnd = config.heightEnd;

				region.getBoundingSphere( sphere );

				// Test all 8 corner points
				for ( const h of [ region.heightStart, region.heightEnd ] ) {

					for ( const lat of [ region.latStart, region.latEnd ] ) {

						for ( const lon of [ region.lonStart, region.lonEnd ] ) {

							region.getCartographicToPosition( lat, lon, h, point );
							expect( sphere.containsPoint( point ) ).toBe( true );

						}

					}

				}

			} );

		} );

		it( 'should contain a sweep of points across the region surface.', () => {

			const SWEEP_COUNT = 10;
			const sphere = new Sphere();
			const point = new Vector3();

			TEST_REGIONS.forEach( ( config ) => {

				const region = new EllipsoidRegion( 1, 1, 1 );
				region.latStart = config.latStart;
				region.latEnd = config.latEnd;
				region.lonStart = config.lonStart;
				region.lonEnd = config.lonEnd;
				region.heightStart = config.heightStart;
				region.heightEnd = config.heightEnd;

				region.getBoundingSphere( sphere );

				// Sweep through latitude, longitude, and height
				for ( let latStep = 0; latStep <= SWEEP_COUNT; latStep ++ ) {

					const lat = MathUtils.mapLinear( latStep, 0, SWEEP_COUNT, region.latStart, region.latEnd );

					for ( let lonStep = 0; lonStep <= SWEEP_COUNT; lonStep ++ ) {

						const lon = MathUtils.mapLinear( lonStep, 0, SWEEP_COUNT, region.lonStart, region.lonEnd );

						for ( const h of [ region.heightStart, region.heightEnd ] ) {

							region.getCartographicToPosition( lat, lon, h, point );
							expect( sphere.containsPoint( point ) ).toBe( true );

						}

					}

				}

			} );

		} );

		it( 'should handle regions crossing the equator.', () => {

			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 4;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI / 2;
			region.heightStart = - 0.1;
			region.heightEnd = 0.1;

			region.getBoundingSphere( sphere );

			// Test points at the equator (where bulging is maximum)
			for ( let lonStep = 0; lonStep <= 10; lonStep ++ ) {

				const lon = MathUtils.mapLinear( lonStep, 0, 10, region.lonStart, region.lonEnd );

				for ( const h of [ region.heightStart, region.heightEnd ] ) {

					region.getCartographicToPosition( 0, lon, h, point );
					expect( sphere.containsPoint( point ) ).toBe( true );

				}

			}

		} );

		it( 'should handle wide longitude regions (> PI).', () => {

			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 4;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI * 1.5; // > PI
			region.heightStart = - 0.1;
			region.heightEnd = 0.1;

			region.getBoundingSphere( sphere );

			// Test a sweep of points
			for ( let latStep = 0; latStep <= 5; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 5, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 10; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 10, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );
						expect( sphere.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

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

	describe( 'Combined bounding box and sphere test', () => {

		it( 'should encapsulate a deterministic grid of points in both volumes.', () => {

			const SWEEP_LAT = 8;
			const SWEEP_LON = 10;
			const SWEEP_HEIGHT = 5;
			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			TEST_REGIONS.forEach( ( config ) => {

				const region = new EllipsoidRegion( 1, 1, 1 );
				region.latStart = config.latStart;
				region.latEnd = config.latEnd;
				region.lonStart = config.lonStart;
				region.lonEnd = config.lonEnd;
				region.heightStart = config.heightStart;
				region.heightEnd = config.heightEnd;

				region.getBoundingBox( box, matrix );
				region.getBoundingSphere( sphere );
				invMatrix.copy( matrix ).invert();

				// Test a deterministic grid of points
				for ( let latStep = 0; latStep <= SWEEP_LAT; latStep ++ ) {

					const lat = MathUtils.mapLinear( latStep, 0, SWEEP_LAT, region.latStart, region.latEnd );

					for ( let lonStep = 0; lonStep <= SWEEP_LON; lonStep ++ ) {

						const lon = MathUtils.mapLinear( lonStep, 0, SWEEP_LON, region.lonStart, region.lonEnd );

						for ( let heightStep = 0; heightStep <= SWEEP_HEIGHT; heightStep ++ ) {

							const height = MathUtils.mapLinear( heightStep, 0, SWEEP_HEIGHT, region.heightStart, region.heightEnd );

							region.getCartographicToPosition( lat, lon, height, point );

							// Test sphere containment
							expect( sphere.containsPoint( point ) ).toBe( true );

							// Test box containment (transform to local space)
							point.applyMatrix4( invMatrix );
							expect( box.containsPoint( point ) ).toBe( true );

						}

					}

				}

			} );

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

		it( 'should handle regions at different ellipsoid radii.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			// Test with different ellipsoid shapes
			const ellipsoids = [
				{ x: 1, y: 1, z: 1 }, // Sphere
				{ x: 2, y: 2, z: 1.5 }, // Oblate (flattened)
				{ x: 1, y: 1, z: 1.5 }, // Prolate (elongated)
				{ x: 2, y: 1.5, z: 1 }, // Triaxial
			];

			ellipsoids.forEach( ( ellipsoid ) => {

				const region = new EllipsoidRegion( ellipsoid.x, ellipsoid.y, ellipsoid.z );
				region.latStart = - Math.PI / 6;
				region.latEnd = Math.PI / 6;
				region.lonStart = 0;
				region.lonEnd = Math.PI / 3;
				region.heightStart = - 0.05;
				region.heightEnd = 0.1;

				region.getBoundingBox( box, matrix );
				region.getBoundingSphere( sphere );
				invMatrix.copy( matrix ).invert();

				// Test corners
				for ( const h of [ region.heightStart, region.heightEnd ] ) {

					for ( const lat of [ region.latStart, region.latEnd ] ) {

						for ( const lon of [ region.lonStart, region.lonEnd ] ) {

							region.getCartographicToPosition( lat, lon, h, point );

							expect( sphere.containsPoint( point ) ).toBe( true );

							point.applyMatrix4( invMatrix );
							expect( box.containsPoint( point ) ).toBe( true );

						}

					}

				}

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

	describe( 'Wide longitude regions (> PI)', () => {

		it( 'should handle longitude span slightly greater than PI.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 4;
			region.latEnd = Math.PI / 4;
			region.lonStart = 0;
			region.lonEnd = Math.PI * 1.1; // Slightly > PI
			region.heightStart = - 0.05;
			region.heightEnd = 0.1;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// Test corners and interior points
			for ( let latStep = 0; latStep <= 4; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 4, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 8; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 8, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );

						// Test sphere
						expect( sphere.containsPoint( point ) ).toBe( true );

						// Test box
						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

		it( 'should handle longitude span at 1.5*PI.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 6;
			region.latEnd = Math.PI / 6;
			region.lonStart = 0;
			region.lonEnd = Math.PI * 1.5;
			region.heightStart = 0;
			region.heightEnd = 0.1;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// Test a comprehensive grid
			for ( let latStep = 0; latStep <= 6; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 6, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 12; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 12, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );

						expect( sphere.containsPoint( point ) ).toBe( true );

						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

		it( 'should handle nearly full circle (1.9*PI).', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 8;
			region.latEnd = Math.PI / 8;
			region.lonStart = 0.1;
			region.lonEnd = Math.PI * 1.9 + 0.1;
			region.heightStart = - 0.05;
			region.heightEnd = 0.05;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// Test many points around the nearly-complete circle
			for ( let latStep = 0; latStep <= 4; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 4, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 20; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 20, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );

						expect( sphere.containsPoint( point ) ).toBe( true );

						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

		it( 'should handle wide regions with equator crossing.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = - Math.PI / 3;
			region.latEnd = Math.PI / 3;
			region.lonStart = 0;
			region.lonEnd = Math.PI * 1.6; // > PI and crosses equator
			region.heightStart = - 0.1;
			region.heightEnd = 0.1;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// Extra emphasis on equator points
			for ( let lonStep = 0; lonStep <= 16; lonStep ++ ) {

				const lon = MathUtils.mapLinear( lonStep, 0, 16, region.lonStart, region.lonEnd );

				for ( const h of [ region.heightStart, region.heightEnd ] ) {

					// Test at equator
					region.getCartographicToPosition( 0, lon, h, point );

					expect( sphere.containsPoint( point ) ).toBe( true );

					point.applyMatrix4( invMatrix );
					expect( box.containsPoint( point ) ).toBe( true );

				}

			}

		} );

		it( 'should handle wide polar regions.', () => {

			const matrix = new Matrix4();
			const invMatrix = new Matrix4();
			const box = new Box3();
			const sphere = new Sphere();
			const point = new Vector3();

			const region = new EllipsoidRegion( 1, 1, 1 );
			region.latStart = Math.PI / 3;
			region.latEnd = Math.PI / 2;
			region.lonStart = 0;
			region.lonEnd = Math.PI * 1.7; // Wide region at high latitude
			region.heightStart = 0;
			region.heightEnd = 0.05;

			region.getBoundingBox( box, matrix );
			region.getBoundingSphere( sphere );
			invMatrix.copy( matrix ).invert();

			// Test grid with emphasis on poles
			for ( let latStep = 0; latStep <= 5; latStep ++ ) {

				const lat = MathUtils.mapLinear( latStep, 0, 5, region.latStart, region.latEnd );

				for ( let lonStep = 0; lonStep <= 12; lonStep ++ ) {

					const lon = MathUtils.mapLinear( lonStep, 0, 12, region.lonStart, region.lonEnd );

					for ( const h of [ region.heightStart, region.heightEnd ] ) {

						region.getCartographicToPosition( lat, lon, h, point );

						expect( sphere.containsPoint( point ) ).toBe( true );

						point.applyMatrix4( invMatrix );
						expect( box.containsPoint( point ) ).toBe( true );

					}

				}

			}

		} );

	} );

} );
