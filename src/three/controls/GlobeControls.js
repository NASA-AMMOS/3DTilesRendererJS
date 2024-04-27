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

	getClosestPointOnSurface( target ) {

		const { ellipsoid, camera, tilesGroup } = this;

		_invMatrix
			.copy( tilesGroup.matrixWorld )
			.invert();

		// get camera position in local frame
		target
			.setFromMatrixPosition( camera.matrixWorld )
			.applyMatrix4( _invMatrix );

		// get point on surface
		ellipsoid
			.getPositionToSurfacePoint( target, target )
			.applyMatrix4( tilesGroup.matrixWorld );

		return target;

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

		if ( ! this.tilesGroup || ! this.camera ) {

			return;

		}

		super.update();

		const {
			camera,
			tilesGroup,
			pivotMesh,
			ellipsoid,
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
		// when adjusting the up frame
		// whether controls are based on a far distance from the camera while moving hte camera
		if ( ! this._isNearControls() ) {

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



		if ( camera.isOrthographicCamera ) {

			_invMatrix.copy( camera.matrixWorld ).invert();

			const v = new Vector3().setFromMatrixPosition( this.tilesGroup.matrixWorld ).applyMatrix4( _invMatrix );

			camera.near = - Math.max( ...this.ellipsoid.radius );
			camera.far = - v.z;

		}

		camera.updateProjectionMatrix();

	}

	// resets the "stuck" drag modes
	resetState() {

		super.resetState();
		this._dragMode = 0;
		this._rotationMode = 0;

	}

	// animate the frame to align to an up direction
	_setFrame( ...args ) {

		super._setFrame( ...args );

		if ( this._isNearControls() ) {

			this._alignCameraUp( this.up, 1 );

		}

	}

	_updatePosition( ...args ) {

		// whether controls are based on a far distance from the camera
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

	}

	// disable rotation once we're outside the control transition
	_updateRotation( ...args ) {

		// whether controls are based on a far distance from the camera
		if ( this._rotationMode === 1 || this._isNearControls() ) {

			this._rotationMode = 1;
			super._updateRotation( ...args );

		} else {

			this.pivotMesh.visible = false;
			this._rotationMode = - 1;

		}

	}

	_updateZoom() {

		window.CONTROLS = this;
		const { zoomDelta, camera, zoomSpeed } = this;

		// whether controls are based on a far distance from the camera
		if ( this._isNearControls() || zoomDelta > 0 ) {

			super._updateZoom();

		} else {

			if ( camera.isOrthographicCamera ) {

				// zoom the camera
				const normalizedDelta = Math.pow( 0.95, Math.abs( zoomDelta * 0.05 ) );
				const scaleFactor = zoomDelta > 0 ? 1 / Math.abs( normalizedDelta ) : normalizedDelta;
				const maxDiameter = 2.0 * Math.max( ...this.ellipsoid.radius );
				const minZoom = Math.min( camera.right - camera.left, camera.top - camera.bottom ) / maxDiameter;

				camera.zoom = Math.max( 0.75 * minZoom, camera.zoom * scaleFactor * zoomSpeed );
				camera.updateProjectionMatrix();

				let alpha = MathUtils.mapLinear( camera.zoom, minZoom * 1.25, minZoom * 0.75, 0, 1 );
				if ( alpha > 0 ) {

					alpha = MathUtils.clamp( alpha, 0, 1 );
					this._tiltTowardsCenter( MathUtils.lerp( 1, 0.8, alpha ) );
					this._alignCameraUpToNorth( MathUtils.lerp( 1, 0.9, alpha ) );

				}

				// this.zoomDelta = 0;

			}

			if ( camera.isPerspectiveCamera ) {

				// orient the camera to focus on the earth during the zoom
				const alpha = MathUtils.mapLinear( this.getDistanceToCenter(), GLOBE_TRANSITION_THRESHOLD, MAX_GLOBE_DISTANCE, 0, 1 );
				this._tiltTowardsCenter( MathUtils.lerp( 1, 0.8, alpha ) );
				this._alignCameraUpToNorth( MathUtils.lerp( 1, 0.9, alpha ) );

			}

			// get the distance to the surface of the sphere and compute teh zoom scale
			const dist = this.getClosestPointOnSurface( _vec ).distanceTo( camera.position );
			const scale = zoomDelta * dist * zoomSpeed * 0.0025;

			// zoom out directly from the globe center
			this.getVectorToCenter( _vec ).normalize();
			this.camera.position.addScaledVector( _vec, scale );
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

	// whether controls are based on a far distance from the camera
	_isNearControls() {

		const { camera, ellipsoid } = this;
		const maxDiameter = 2.0 * Math.max( ...ellipsoid.radius );

		let isFullyInView = false;
		if ( camera.isOrthographicCamera ) {

			const maxView = Math.min( camera.right - camera.left, camera.top - camera.bottom ) / camera.zoom;
			isFullyInView = 0.5 * maxDiameter > maxView;

		} else {

			isFullyInView = this.getDistanceToCenter() < GLOBE_TRANSITION_THRESHOLD;

		}

		return isFullyInView;

	}

}
