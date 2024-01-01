import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	MathUtils,
} from 'three';
import { TileControls, makeRotateAroundPoint } from './TileControls.js';
import { WGS84_ELLIPSOID } from '../../src/index.js';

const _rotMatrix = new Matrix4();
const _vec = new Vector3();
const _forward = new Vector3();
const _quaternion = new Quaternion();

const _pointer = new Vector2();
const _prevPointer = new Vector2();
const _deltaPointer = new Vector2();

const MAX_GLOBE_DISTANCE = 2 * 1e7;
const GLOBE_TRANSITION_THRESHOLD = 0.75 * 1e7;
export class GlobeControls extends TileControls {

	constructor( ...args ) {

		// store which mode the drag stats are in
		super( ...args );
		this._dragMode = 0;
		this._rotationMode = 0;

	}

	getVectorToCenter( target ) {

		const { scene, camera } = this;
		return target
			.setFromMatrixPosition( scene.matrixWorld )
			.sub( camera.position );

	}

	getDistanceToCenter() {

		return this
			.getVectorToCenter( _vec )
			.length();

	}

	update() {

		super.update();

		const {
			camera,
			scene,
			pivotMesh,
		} = this;

		// clamp the camera distance
		let distanceToCenter = this.getDistanceToCenter();
		if ( distanceToCenter > MAX_GLOBE_DISTANCE ) {

			_vec.setFromMatrixPosition( scene.matrixWorld ).sub( camera.position ).normalize().multiplyScalar( - 1 );
			camera.position.setFromMatrixPosition( scene.matrixWorld ).addScaledVector( _vec, MAX_GLOBE_DISTANCE );
			camera.updateMatrixWorld();

			distanceToCenter = MAX_GLOBE_DISTANCE;

		}

		if ( distanceToCenter > GLOBE_TRANSITION_THRESHOLD ) {

			pivotMesh.visible = false;
			this.reorientOnDrag = false;
			this.reorientOnZoom = true;

		} else {

			pivotMesh.visible = true;
			this.reorientOnDrag = true;
			this.reorientOnZoom = false;

		}

		// update the projection matrix
		const largestDistance = Math.max( ...WGS84_ELLIPSOID.radius );
		camera.near = Math.max( 1, distanceToCenter - largestDistance * 1.25 );
		camera.far = distanceToCenter + largestDistance + 0.1;
		camera.updateProjectionMatrix();

	}

	resetState() {

		super.resetState();
		this._dragMode = 0;
		this._rotationMode = 0;

	}

	_updatePosition( ...args ) {

		if ( this._dragMode === 1 || this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD ) {

			this._dragMode = 1;

			super._updatePosition( ...args );

		} else {

			this._dragMode = - 1;

			const {
				pointerTracker,
				rotationSpeed,
				camera,
				pivotMesh,
			} = this;
			pointerTracker.getCenterPoint( _pointer );
			pointerTracker.getPreviousCenterPoint( _prevPointer );

			_deltaPointer
				.subVectors( _pointer, _prevPointer )
				.multiplyScalar( camera.position.distanceTo( this.dragPoint ) * 1e-8 * 5 * 1e-3 );

			const azimuth = - _deltaPointer.x * rotationSpeed;
			const altitude = - _deltaPointer.y * rotationSpeed;

			const _center = new Vector3().setFromMatrixPosition( this.scene.matrixWorld );
			const _right = new Vector3( 1, 0, 0 ).transformDirection( camera.matrixWorld );
			const _up = new Vector3( 0, 1, 0 ).transformDirection( camera.matrixWorld );

			_quaternion.setFromAxisAngle( _right, altitude );
			camera.quaternion.premultiply( _quaternion );
			makeRotateAroundPoint( _center, _quaternion, _rotMatrix );
			camera.matrixWorld.premultiply( _rotMatrix );

			_quaternion.setFromAxisAngle( _up, azimuth );
			camera.quaternion.premultiply( _quaternion );
			makeRotateAroundPoint( _center, _quaternion, _rotMatrix );
			camera.matrixWorld.premultiply( _rotMatrix );

			camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

			pivotMesh.visible = false;


		}

	}

	_updateRotation( ...args ) {

		if ( this._rotationMode === 1 || this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD ) {

			this._rotationMode = 1;
			super._updateRotation( ...args );

		} else {

			this._rotationMode = - 1;

		}

	}

	_updateZoom( delta ) {

		if ( this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD || delta > 0 ) {

			super._updateZoom( delta );

		} else {

			// orient the camera during the zoom
			const alpha = MathUtils.mapLinear( this.getDistanceToCenter(), GLOBE_TRANSITION_THRESHOLD, MAX_GLOBE_DISTANCE, 0, 1 );
			this._tiltTowardsCenter( MathUtils.lerp( 1, 0.8, alpha ) );
			this._alignCameraUpToNorth( MathUtils.lerp( 1, 0.9, alpha ) );

			this.getVectorToCenter( _vec );
			const dist = _vec.length();

			this.camera.position.addScaledVector( _vec, delta * 0.0025 * dist / dist );
			this.camera.updateMatrixWorld();

		}

	}

	_alignCameraUpToNorth( alpha ) {

		const { scene, camera } = this;
		const _globalUp = new Vector3( 0, 0, 1 ).transformDirection( scene.matrixWorld );
		const _forward = new Vector3( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
		const _right = new Vector3( - 1, 0, 0 ).transformDirection( camera.matrixWorld );
		const _targetRight = new Vector3().crossVectors( _globalUp, _forward );

		_targetRight.lerp( _right, alpha ).normalize();

		_quaternion.setFromUnitVectors( _right, _targetRight );
		camera.quaternion.premultiply( _quaternion );
		camera.updateMatrixWorld();

	}

	_tiltTowardsCenter( alpha ) {

		const {
			camera,
			scene,
		} = this;

		_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld ).normalize();
		_vec.setFromMatrixPosition( scene.matrixWorld ).sub( camera.position ).normalize();
		_vec.lerp( _forward, alpha ).normalize();

		_quaternion.setFromUnitVectors( _forward, _vec );
		camera.quaternion.premultiply( _quaternion );
		camera.updateMatrixWorld();

	}

}
