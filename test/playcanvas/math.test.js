import { Mat4, Quat, Vec3 } from 'playcanvas';
import { CameraFrustum } from '../../src/playcanvas/renderer/math/CameraFrustum.js';
import {
	createMatrix,
	decomposeMatrix,
	invertMatrix,
	makeRotationX,
	makeTranslation,
	multiplyMatrices,
	transformPoint,
} from '../../src/playcanvas/renderer/math/MatrixUtils.js';
import { TileBoundingVolume } from '../../src/playcanvas/renderer/math/TileBoundingVolume.js';

// a perspective camera at the origin looking down -Z, as PlayCanvas cameras do
function createFrustum() {

	const projection = new Mat4().setPerspective( 60, 1, 1, 100 );
	return new CameraFrustum().setFromMatrix( projection.data );

}

function createBox( x, y, z, halfSize, transform = createMatrix() ) {

	const volume = new TileBoundingVolume();
	volume.setObbData( [ x, y, z, halfSize, 0, 0, 0, halfSize, 0, 0, 0, halfSize ], transform );
	return volume;

}

describe( 'PlayCanvas MatrixUtils', () => {

	it( 'should keep geospatial translations precise when inverting.', () => {

		// a rotated transform with an Earth radius sized translation, which 32-bit floats would
		// round to about half a meter
		const matrix = multiplyMatrices(
			makeTranslation( 6378137.123, 1234.5678, - 4321.8765, createMatrix() ),
			makeRotationX( 0.3, createMatrix() ),
			createMatrix(),
		);
		const inverse = invertMatrix( matrix, createMatrix() );

		const point = transformPoint( matrix, 1.25, 2.5, 3.75, new Vec3() );
		transformPoint( inverse, point.x, point.y, point.z, point );
		expect( point.x ).toBeCloseTo( 1.25, 6 );
		expect( point.y ).toBeCloseTo( 2.5, 6 );
		expect( point.z ).toBeCloseTo( 3.75, 6 );

	} );

	it( 'should decompose into translation, rotation and scale.', () => {

		const matrix = multiplyMatrices(
			makeTranslation( 6378137.125, 2, 3, createMatrix() ),
			makeRotationX( Math.PI / 2, createMatrix() ),
			createMatrix(),
		);

		// uniform scale of 2
		for ( let i = 0; i < 12; i ++ ) {

			if ( i % 4 !== 3 ) {

				matrix[ i ] *= 2;

			}

		}

		const position = new Vec3();
		const rotation = new Quat();
		const scale = new Vec3();
		decomposeMatrix( matrix, position, rotation, scale );

		expect( position.x ).toBe( 6378137.125 );
		expect( scale.x ).toBeCloseTo( 2, 10 );
		expect( scale.y ).toBeCloseTo( 2, 10 );
		expect( scale.z ).toBeCloseTo( 2, 10 );

		const expected = new Quat().setFromEulerAngles( 90, 0, 0 );
		expect( Math.abs( rotation.dot( expected ) ) ).toBeCloseTo( 1, 6 );

	} );

} );

describe( 'PlayCanvas TileBoundingVolume', () => {

	it( 'should report boxes in front of the camera as in view.', () => {

		const frustum = createFrustum();
		expect( createBox( 0, 0, - 10, 1 ).intersectsFrustum( frustum ) ).toBe( true );

		// straddling the near plane
		expect( createBox( 0, 0, 0, 2 ).intersectsFrustum( frustum ) ).toBe( true );

	} );

	it( 'should report boxes behind or beside the camera as out of view.', () => {

		const frustum = createFrustum();
		expect( createBox( 0, 0, 10, 1 ).intersectsFrustum( frustum ) ).toBe( false );
		expect( createBox( 50, 0, - 10, 1 ).intersectsFrustum( frustum ) ).toBe( false );
		expect( createBox( 0, 0, - 200, 1 ).intersectsFrustum( frustum ) ).toBe( false );

	} );

	it( 'should reject a box that only overlaps the frustum planes from outside a corner.', () => {

		// beyond the far right corner every frustum plane has a box corner in front of it, but the
		// box is outside the frustum - the box planes test catches what the frustum planes miss
		const frustum = createFrustum();
		expect( createBox( 70, 0, - 105, 10 ).intersectsFrustum( frustum ) ).toBe( false );

	} );

	it( 'should measure the distance to boxes and spheres in the transformed frame.', () => {

		const transform = makeTranslation( 0, 0, - 10, createMatrix() );
		const box = createBox( 0, 0, 0, 1, transform );
		expect( box.distanceToPoint( new Vec3( 0, 0, 0 ) ) ).toBeCloseTo( 9, 10 );
		expect( box.distanceToPoint( new Vec3( 0, 0, - 10 ) ) ).toBe( 0 );

		const sphere = new TileBoundingVolume();
		sphere.setSphereData( 0, 0, 0, 2, transform );
		expect( sphere.distanceToPoint( new Vec3( 0, 0, 0 ) ) ).toBeCloseTo( 8, 10 );
		expect( sphere.intersectsFrustum( createFrustum() ) ).toBe( true );

	} );

	it( 'should handle boxes with a zero size axis.', () => {

		const volume = new TileBoundingVolume();
		volume.setObbData( [ 0, 0, - 10, 1, 0, 0, 0, 1, 0, 0, 0, 0 ], createMatrix() );
		expect( volume.intersectsFrustum( createFrustum() ) ).toBe( true );
		expect( volume.distanceToPoint( new Vec3( 0, 0, 0 ) ) ).toBeCloseTo( 10, 10 );

	} );

} );
