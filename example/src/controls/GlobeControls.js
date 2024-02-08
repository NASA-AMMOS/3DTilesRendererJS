import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	MathUtils,
} from 'three';
import { EnvironmentControls, NONE } from './EnvironmentControls.js';
import { makeRotateAroundPoint } from './utils.js';
import { WGS84_ELLIPSOID } from '../../../src/index.js';

const _invMatrix = new Matrix4();
const _rotMatrix = new Matrix4();
const _vec = new Vector3();
const _center = new Vector3();
const _up = new Vector3();
const _forward = new Vector3();
const _right = new Vector3();
const _targetRight = new Vector3();
const _globalUp = new Vector3();
const _quaternion = new Quaternion();

const _pointer = new Vector2();
const _prevPointer = new Vector2();
const _deltaPointer = new Vector2();

const MAX_GLOBE_DISTANCE = 2 * 1e7;
const GLOBE_TRANSITION_THRESHOLD = 0.75 * 1e7;
export class GlobeControls extends EnvironmentControls {

	get ellipsoid() {

		return this._tilesRenderer ? this._tilesRenderer.ellipsoid : null;

	}

	get tilesGroup() {

		return this._tilesRenderer ? this._tilesRenderer.group : null;

	}

	constructor( scene = null, camera = null, domElement = null, tilesRenderer = null ) {

		// store which mode the drag stats are in
		super( scene, camera, domElement );
		this._tilesRenderer = null;
		this._dragMode = 0;
		this._rotationMode = 0;

		this.setTilesRenderer( tilesRenderer );

	}

	setTilesRenderer( tilesRenderer ) {

		this._tilesRenderer = tilesRenderer;
		if ( this.scene === null && this._tilesRenderer !== null ) {

			this.setScene( this._tilesRenderer.group );

		}

	}

	setScene( scene ) {

		if ( scene === null && this._tilesRenderer !== null ) {

			super.setScene( this._tilesRenderer.group );

		} else {

			super.setScene( scene );

		}

	}

	// get the vector to the center of the provided globe
	getVectorToCenter( target ) {

		const { tilesGroup, camera } = this;
		return target
			.setFromMatrixPosition( tilesGroup.matrixWorld )
			.sub( camera.position );

	}

	// get the distance to the center of the globe
	getDistanceToCenter() {

		return this
			.getVectorToCenter( _vec )
			.length();

	}

	getUpDirection( point, target ) {

		// get the "up" direction based on the wgs84 ellipsoid
		const { tilesGroup, ellipsoid } = this;
		const invMatrix = _invMatrix.copy( tilesGroup.matrixWorld ).invert();
		const pos = _vec.copy( point ).applyMatrix4( invMatrix );

		ellipsoid.getPositionToNormal( pos, target );
		target.transformDirection( tilesGroup.matrixWorld );

	}

	update() {

		super.update();

		const {
			camera,
			tilesGroup,
			pivotMesh,
		} = this;

		// clamp the camera distance
		let distanceToCenter = this.getDistanceToCenter();
		if ( distanceToCenter > MAX_GLOBE_DISTANCE ) {

			_vec.setFromMatrixPosition( tilesGroup.matrixWorld ).sub( camera.position ).normalize().multiplyScalar( - 1 );
			camera.position.setFromMatrixPosition( tilesGroup.matrixWorld ).addScaledVector( _vec, MAX_GLOBE_DISTANCE );
			camera.updateMatrixWorld();

			distanceToCenter = MAX_GLOBE_DISTANCE;

		}

		// if we're outside the transition threshold then we toggle some reorientation behavior
		// when adjusting the up frame while moving hte camera
		if ( distanceToCenter > GLOBE_TRANSITION_THRESHOLD ) {

			if ( this.state !== NONE && this._dragMode !== 1 && this._rotationMode !== 1 ) {

				pivotMesh.visible = false;

			}
			this.reorientOnDrag = false;
			this.reorientOnZoom = true;

		} else {

			this.reorientOnDrag = true;
			this.reorientOnZoom = false;

		}

		// update the projection matrix
		const largestDistance = Math.max( ...WGS84_ELLIPSOID.radius );
		camera.near = Math.max( 1, distanceToCenter - largestDistance * 1.25 );
		camera.far = distanceToCenter + largestDistance + 0.1;
		camera.updateProjectionMatrix();

	}

	// resets the "stuck" drag modes
	resetState() {

		super.resetState();
		this._dragMode = 0;
		this._rotationMode = 0;

	}

	// animate the frame to align to an up direction
	setFrame( ...args ) {

		super.setFrame( ...args );

		if ( this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD ) {

			this._alignCameraUp( this.up );

		}

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
				dragPoint,
				tilesGroup,
			} = this;

			// get the delta movement with magic numbers scaled by the distance to the
			// grabbed point so it feels okay
			// TODO: it would be better to properly calculate angle based on drag distance
			pointerTracker.getCenterPoint( _pointer );
			pointerTracker.getPreviousCenterPoint( _prevPointer );
			_deltaPointer
				.subVectors( _pointer, _prevPointer )
				.multiplyScalar( camera.position.distanceTo( dragPoint ) * 1e-10 / devicePixelRatio );

			const azimuth = - _deltaPointer.x * rotationSpeed;
			const altitude = - _deltaPointer.y * rotationSpeed;

			_center.setFromMatrixPosition( tilesGroup.matrixWorld );
			_right.set( 1, 0, 0 ).transformDirection( camera.matrixWorld );
			_up.set( 0, 1, 0 ).transformDirection( camera.matrixWorld );

			// apply the altitude and azimuth adjustment
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

	// disable rotation once we're outside the control transition
	_updateRotation( ...args ) {

		if ( this._rotationMode === 1 || this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD ) {

			this._rotationMode = 1;
			super._updateRotation( ...args );

		} else {

			this.pivotMesh.visible = false;
			this._rotationMode = - 1;

		}

	}

	_updateZoom() {

		const scale = this.zoomDelta;
		if ( this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD || scale > 0 ) {

			super._updateZoom();

		} else {

			// orient the camera to focus on the earth during the zoom
			const alpha = MathUtils.mapLinear( this.getDistanceToCenter(), GLOBE_TRANSITION_THRESHOLD, MAX_GLOBE_DISTANCE, 0, 1 );
			this._tiltTowardsCenter( MathUtils.lerp( 1, 0.8, alpha ) );
			this._alignCameraUpToNorth( MathUtils.lerp( 1, 0.9, alpha ) );

			// zoom out directly from the globe center
			this.getVectorToCenter( _vec );
			this.camera.position.addScaledVector( _vec, scale * 0.0025 );
			this.camera.updateMatrixWorld();

			this.zoomDelta = 0;

		}

	}

	// tilt the camera to align with north
	_alignCameraUpToNorth( alpha ) {

		const { tilesGroup } = this;
		_globalUp.set( 0, 0, 1 ).transformDirection( tilesGroup.matrixWorld );
		this._alignCameraUp( _globalUp, alpha );

	}

	// tilt the camera to align with the provided "up" value
	_alignCameraUp( up, alpha = null ) {

		const { camera } = this;
		_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
		_right.set( - 1, 0, 0 ).transformDirection( camera.matrixWorld );
		_targetRight.crossVectors( up, _forward );

		if ( alpha === null ) {

			alpha = Math.abs( _forward.dot( up ) );

		}

		_targetRight.lerp( _right, alpha ).normalize();

		_quaternion.setFromUnitVectors( _right, _targetRight );
		camera.quaternion.premultiply( _quaternion );
		camera.updateMatrixWorld();

	}

	// tilt the camera to look at the center of the globe
	_tiltTowardsCenter( alpha ) {

		const {
			camera,
			tilesGroup,
		} = this;

		_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld ).normalize();
		_vec.setFromMatrixPosition( tilesGroup.matrixWorld ).sub( camera.position ).normalize();
		_vec.lerp( _forward, alpha ).normalize();

		_quaternion.setFromUnitVectors( _forward, _vec );
		camera.quaternion.premultiply( _quaternion );
		camera.updateMatrixWorld();

	}

}
