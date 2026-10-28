import { Frustum, Mat4, Plane, Quat, Vec3, Vec4 } from 'playcanvas';
import { TileBoundingVolume } from '../../src/playcanvas/renderer/math/TileBoundingVolume.js';

// a frustum with its planes and corners, set up the same way as TilesRenderer does for a camera
function createFrustum( fov, near, far, position, target ) {

	const projection = new Mat4().setPerspective( fov, 1, near, far );
	const view = new Mat4().setLookAt( position, target, Vec3.UP ).invert();
	const clip = new Mat4().mul2( projection, view );

	const frustum = new Frustum();
	frustum.setFromMat4( clip );
	const planes = new Array( 6 ).fill( null ).map( ( v, i ) => frustum.getPlane( i, new Plane() ) );

	const inverse = clip.clone().invert();
	const points = [];
	for ( const x of [ - 1, 1 ] ) {

		for ( const y of [ - 1, 1 ] ) {

			for ( const z of [ - 1, 1 ] ) {

				const corner = inverse.transformVec4( new Vec4( x, y, z, 1 ) );
				points.push( new Vec3( corner.x / corner.w, corner.y / corner.w, corner.z / corner.w ) );

			}

		}

	}

	return { frustum, planes, points };

}

// a 3D Tiles box: center, then the x, y and z half-axis vectors
function box( cx, cy, cz, hx, hy, hz ) {

	return [ cx, cy, cz, hx, 0, 0, 0, hy, 0, 0, 0, hz ];

}

describe( 'PlayCanvas TileBoundingVolume', () => {

	it( 'should measure the distance to a box in the tile frame.', () => {

		const volume = new TileBoundingVolume();
		volume.setObbData( box( 0, 0, 0, 1, 2, 3 ), new Mat4() );

		expect( volume.distanceToPoint( new Vec3( 0, 0, 0 ) ) ).toBe( 0 );
		expect( volume.distanceToPoint( new Vec3( 5, 0, 0 ) ) ).toBeCloseTo( 4, 5 );
		expect( volume.distanceToPoint( new Vec3( 0, 0, - 7 ) ) ).toBeCloseTo( 4, 5 );

		// the tile transform moves and rotates the box: its local x axis now points along world z
		const transform = new Mat4().setTRS( new Vec3( 10, 0, 0 ), new Quat().setFromEulerAngles( 0, - 90, 0 ), Vec3.ONE );
		volume.setObbData( box( 0, 0, 0, 1, 2, 3 ), transform );
		expect( volume.distanceToPoint( new Vec3( 10, 0, 0 ) ) ).toBe( 0 );
		expect( volume.distanceToPoint( new Vec3( 10, 0, 5 ) ) ).toBeCloseTo( 4, 5 );
		expect( volume.distanceToPoint( new Vec3( 15, 0, 0 ) ) ).toBeCloseTo( 2, 5 );

	} );

	it( 'should handle a box that is flat in one axis.', () => {

		const volume = new TileBoundingVolume();
		volume.setObbData( box( 0, 0, 0, 1, 1, 0 ), new Mat4() );

		expect( volume.distanceToPoint( new Vec3( 0, 0, 3 ) ) ).toBeCloseTo( 3, 5 );
		expect( volume.distanceToPoint( new Vec3( 0, 0, - 3 ) ) ).toBeCloseTo( 3, 5 );

	} );

	it( 'should scale a sphere by the largest scale of the tile transform.', () => {

		const volume = new TileBoundingVolume();
		const transform = new Mat4().setTRS( new Vec3( 0, 5, 0 ), Quat.IDENTITY, new Vec3( 1, 3, 2 ) );
		volume.setSphereData( 0, 1, 0, 2, transform );

		expect( volume.sphere.center.y ).toBeCloseTo( 8, 5 );
		expect( volume.sphere.radius ).toBeCloseTo( 6, 5 );
		expect( volume.distanceToPoint( new Vec3( 0, 8, 0 ) ) ).toBe( 0 );
		expect( volume.distanceToPoint( new Vec3( 10, 8, 0 ) ) ).toBeCloseTo( 4, 5 );

	} );

	it( 'should test boxes and spheres against the frustum.', () => {

		// looking down -z from the origin
		const { frustum, planes, points } = createFrustum( 60, 1, 100, new Vec3( 0, 0, 0 ), new Vec3( 0, 0, - 1 ) );
		const volume = new TileBoundingVolume();

		volume.setObbData( box( 0, 0, - 50, 1, 1, 1 ), new Mat4() );
		expect( volume.intersectsFrustum( frustum, planes, points ) ).toBe( true );

		volume.setObbData( box( 0, 0, 50, 1, 1, 1 ), new Mat4() );
		expect( volume.intersectsFrustum( frustum, planes, points ) ).toBe( false );

		volume.setObbData( box( 0, 0, - 150, 1, 1, 1 ), new Mat4() );
		expect( volume.intersectsFrustum( frustum, planes, points ) ).toBe( false );

		const sphere = new TileBoundingVolume();
		sphere.setSphereData( 0, 0, - 50, 1, new Mat4() );
		expect( sphere.intersectsFrustum( frustum, planes, points ) ).toBe( true );

		sphere.setSphereData( 100, 0, - 50, 1, new Mat4() );
		expect( sphere.intersectsFrustum( frustum, planes, points ) ).toBe( false );

	} );

	it( 'should not report a box that only overlaps the frustum planes past a corner.', () => {

		// the frustum reaches x = 57.7 at its far right edge, at a depth of 100. A box from x = 60
		// to 80 and a depth of 90 to 120 is outside the frustum, but it is in front of both the
		// right and the far plane in part, so a test of the box corners against the frustum
		// planes alone would report it as visible
		const { frustum, planes, points } = createFrustum( 60, 1, 100, new Vec3( 0, 0, 0 ), new Vec3( 0, 0, - 1 ) );
		const volume = new TileBoundingVolume();
		volume.setObbData( box( 70, 0, - 105, 10, 5, 15 ), new Mat4() );

		expect( volume.intersectsFrustum( frustum, planes, points ) ).toBe( false );

	} );

} );
