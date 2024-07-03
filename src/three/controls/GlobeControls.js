import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	MathUtils,
} from 'three';
import { EnvironmentControls, NONE } from './EnvironmentControls.js';
import { makeRotateAroundPoint } from './utils.js';

const _invMatrix = new Matrix4();
const _rotMatrix = new Matrix4();
const _pos = new Vector3();
const _vec = new Vector3();
const _center = new Vector3();
const _up = new Vector3();
const _forward = new Vector3();
const _right = new Vector3();
const _targetRight = new Vector3();
const _globalUp = new Vector3();
const _quaternion = new Quaternion();
const _latLon = {};

const _pointer = new Vector2();
const _prevPointer = new Vector2();
const _deltaPointer = new Vector2();

const MIN_ELEVATION = 10;
const MAX_GLOBE_DISTANCE = 5 * 1e7;
const GLOBE_TRANSITION_THRESHOLD = 3 * 1e7;
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
		this.useFallbackPlane = false;

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

		if ( ! this.enabled || ! this.tilesGroup || ! this.camera ) {

			return;

		}

		const {
			camera,
			tilesGroup,
			pivotMesh,
		} = this;

		// if we're outside the transition threshold then we toggle some reorientation behavior
		// when adjusting the up frame while moving the camera
		if ( this._isNearControls() ) {

			this.reorientOnDrag = true;
			this.reorientOnZoom = this.zoomDelta > 0;

		} else {

			if ( this.state !== NONE && this._dragMode !== 1 && this._rotationMode !== 1 ) {

				pivotMesh.visible = false;

			}
			this.reorientOnDrag = false;
			this.reorientOnZoom = true;

		}

		// fire basic controls update
		super.update();

		// clamp the camera distance
		let distanceToCenter = this.getDistanceToCenter();
		const maxDistance = this._getMaxCameraDistance();
		if ( distanceToCenter > maxDistance ) {

			_vec.setFromMatrixPosition( tilesGroup.matrixWorld ).sub( camera.position ).normalize().multiplyScalar( - 1 );
			camera.position.setFromMatrixPosition( tilesGroup.matrixWorld ).addScaledVector( _vec, maxDistance );
			camera.updateMatrixWorld();

			distanceToCenter = maxDistance;

		}

		// update the camera planes
		this.updateCameraClipPlanes( camera );

	}

	// Updates the passed camera near and far clip planes to encapsulate the
	// ellipsoid from their current position.
	updateCameraClipPlanes( camera ) {

		const {
			tilesGroup,
			ellipsoid,
		} = this;

		const distanceToCenter = this.getDistanceToCenter();
		if ( camera.isPerspectiveCamera ) {

			// update the projection matrix
			// interpolate from the 25% radius margin around the globe down to the surface
			// so we can avoid z fighting when near value is too far at a high altitude
			const largestDistance = Math.max( ...ellipsoid.radius );
			const margin = 0.25 * largestDistance;
			const alpha = MathUtils.clamp( ( distanceToCenter - largestDistance ) / margin, 0, 1 );
			const minNear = MathUtils.lerp( 1, 1000, alpha );
			camera.near = Math.max( minNear, distanceToCenter - largestDistance - margin );

			// update the far plane to the horizon distance
			const invMatrix = _invMatrix.copy( tilesGroup.matrixWorld ).invert();
			_pos.copy( camera.position ).applyMatrix4( invMatrix );
			ellipsoid.getPositionToCartographic( _pos, _latLon );

			// use a minimum elevation for computing the horizon distance to avoid the far clip
			// plane approaching zero as the camera goes to or below sea level.
			const elevation = Math.max( ellipsoid.getPositionElevation( _pos ), MIN_ELEVATION );
			const horizonDistance = ellipsoid.calculateHorizonDistance( _latLon.lat, elevation );
			camera.far = horizonDistance + 0.1;

			camera.updateProjectionMatrix();

		} else {

			_invMatrix.copy( camera.matrixWorld ).invert();
			_vec.setFromMatrixPosition( tilesGroup.matrixWorld ).applyMatrix4( _invMatrix );

			camera.near = - Math.max( ...ellipsoid.radius );
			camera.far = - _vec.z;

		}

	}

	// resets the "stuck" drag modes
	resetState() {

		super.resetState();
		this._dragMode = 0;
		this._rotationMode = 0;

	}

	_updatePosition( ...args ) {

		if ( this._dragMode === 1 || this._isNearControls() ) {

			this._dragMode = 1;

			super._updatePosition( ...args );

		} else {

			this._dragMode = - 1;

			const {
				pointerTracker,
				rotationSpeed,
				camera,
				pivotMesh,
				pivotPoint,
				tilesGroup,
			} = this;

			// get the delta movement with magic numbers scaled by the distance to the
			// grabbed point so it feels okay
			// TODO: it would be better to properly calculate angle based on drag distance
			pointerTracker.getCenterPoint( _pointer );
			pointerTracker.getPreviousCenterPoint( _prevPointer );
			_deltaPointer
				.subVectors( _pointer, _prevPointer )
				.multiplyScalar( camera.position.distanceTo( pivotPoint ) * 5 * 1e-10 / devicePixelRatio );

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

		this._alignCameraUp( this.up );

	}

	// disable rotation once we're outside the control transition
	_updateRotation( ...args ) {

		if ( this._rotationMode === 1 || this._isNearControls() ) {

			this._rotationMode = 1;
			super._updateRotation( ...args );

		} else {

			this.pivotMesh.visible = false;
			this._rotationMode = - 1;

		}

		this._alignCameraUp( this.up );

	}

	_updateZoom() {

		const zoomDelta = this.zoomDelta;
		if ( this._isNearControls() || zoomDelta > 0 ) {

			super._updateZoom();

		} else {

			// orient the camera to focus on the earth during the zoom
			const transitionDistance = this._getPerspectiveTransitionDistance();
			const maxDistance = this._getMaxCameraDistance();
			const alpha = MathUtils.mapLinear( this.getDistanceToCenter(), transitionDistance, maxDistance, 0, 1 );
			this._tiltTowardsCenter( MathUtils.lerp( 0, 0.2, alpha ) );
			this._alignCameraUpToNorth( MathUtils.lerp( 0, 0.1, alpha ) );

			// zoom out directly from the globe center
			this.getVectorToCenter( _vec );
			this.camera.position.addScaledVector( _vec, zoomDelta * 0.0025 );
			this.camera.updateMatrixWorld();

			this.zoomDelta = 0;

		}

		// TODO: we should consider rotating the camera about the zoom point in this case
		// Possibly for drag, too?
		this._alignCameraUp( this.up );

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

		// compute the alpha based on how far away from boresight the up vector is
		// so we can ease into the correct orientation
		if ( alpha === null ) {

			alpha = 1 - Math.abs( _forward.dot( up ) );
			alpha = MathUtils.mapLinear( alpha, 0, 1, - 0.01, 1 );
			alpha = MathUtils.clamp( alpha, 0, 1 ) ** 2;

		}

		_targetRight.lerp( _right, 1 - alpha ).normalize();

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
		_vec.lerp( _forward, 1 - alpha ).normalize();

		_quaternion.setFromUnitVectors( _forward, _vec );
		camera.quaternion.premultiply( _quaternion );
		camera.updateMatrixWorld();

	}

	_getPerspectiveTransitionDistance() {

		return GLOBE_TRANSITION_THRESHOLD;

		// TODO: the zooming seems to fail if the camera is too far out and the target
		// up changes too much on move? Ie zooming into the horizon from afar
		// const { camera, ellipsoid } = this;
		// if ( ! camera.isPerspectiveCamera ) {

		// 	throw new Error();

		// }

		// const ellipsoidSize = Math.max( ...ellipsoid.radius ) * 2;
		// const fovHoriz = 2 * Math.atan( Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 ) * camera.aspect );
		// const distVert = ellipsoidSize / Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 );
		// const distHoriz = ellipsoidSize / Math.tan( fovHoriz * 0.5 );
		// const dist = Math.max( distVert, distHoriz );

		// return dist * 0.7;

	}

	_getMaxCameraDistance() {

		const { camera, ellipsoid } = this;
		if ( ! camera.isPerspectiveCamera || true ) {

			return MAX_GLOBE_DISTANCE;

		}

		const ellipsoidSize = Math.max( ...ellipsoid.radius ) * 2;
		const fovHoriz = 2 * Math.atan( Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 ) * camera.aspect );
		const distVert = ellipsoidSize / Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 );
		const distHoriz = ellipsoidSize / Math.tan( fovHoriz * 0.5 );
		const dist = Math.max( distVert, distHoriz );

		return dist;

	}

	_isNearControls() {

		return this.getDistanceToCenter() < this._getPerspectiveTransitionDistance();

		// const { camera, ellipsoid } = this;
		// if ( camera.isPerspectiveCamera ) {

		// 	return this.getDistanceToCenter() < this._getPerspectiveTransitionDistance();

		// } else {

		// 	const ellipsoidSize = Math.max( ...ellipsoid.radius );
		// 	const orthoHeight = ( camera.top - camera.bottom ) / camera.zoom;
		// 	const orthoWidth = ( camera.right - camera.left ) / camera.zoom;
		// 	const orthoSize = Math.max( orthoHeight, orthoWidth );
		// 	return ellipsoidSize > orthoSize * 0.5;

		// }

	}

}
