import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	MathUtils,
	Ray,
} from 'three';
import { EnvironmentControls, NONE } from './EnvironmentControls.js';
import { closestRayEllipsoidSurfacePointEstimate, makeRotateAroundPoint } from './utils.js';

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
const _zoomPointUp = new Vector3();
const _toCenter = new Vector3();
const _latLon = {};
const _ray = new Ray();

const _pointer = new Vector2();
const _prevPointer = new Vector2();
const _deltaPointer = new Vector2();

const MIN_ELEVATION = 10;
const MAX_GLOBE_DISTANCE = 5 * 1e7;
export class GlobeControls extends EnvironmentControls {

	get ellipsoid() {

		return this.tilesRenderer ? this.tilesRenderer.ellipsoid : null;

	}

	get tilesGroup() {

		return this.tilesRenderer ? this.tilesRenderer.group : null;

	}

	constructor( scene = null, camera = null, domElement = null, tilesRenderer = null ) {

		// store which mode the drag stats are in
		super( scene, camera, domElement );
		this._dragMode = 0;
		this._rotationMode = 0;
		this.maxZoom = 50;
		this.useFallbackPlane = false;

		this.setTilesRenderer( tilesRenderer );

	}

	setScene( scene ) {

		if ( scene === null && this.tilesRenderer !== null ) {

			super.setScene( this.tilesRenderer.group );

		} else {

			super.setScene( scene );

		}

	}

	getPivotPoint( target ) {

		const { camera, tilesGroup, ellipsoid, pivotPoint } = this;
		_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
		_invMatrix.copy( tilesGroup.matrixWorld ).invert();

		_ray.origin.copy( camera.position );
		_ray.direction.copy( _forward );
		_ray.applyMatrix4( _invMatrix );
		closestRayEllipsoidSurfacePointEstimate( _ray, ellipsoid, target );
		target.applyMatrix4( tilesGroup.matrixWorld );

		if ( camera.position.distanceTo( target ) > camera.position.distanceTo( pivotPoint ) ) {

			target.copy( pivotPoint );

		}

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
		_invMatrix.copy( tilesGroup.matrixWorld ).invert();
		_vec.copy( point ).applyMatrix4( _invMatrix );

		ellipsoid.getPositionToNormal( _vec, target );
		target.transformDirection( tilesGroup.matrixWorld );

	}

	getCameraUpDirection( target ) {

		const { tilesGroup, ellipsoid, camera } = this;
		if ( camera.isOrthographicCamera ) {

			_invMatrix.copy( tilesGroup.matrixWorld ).invert();

			// get ray in globe coordinate frame
			_ray.origin.copy( camera.position );
			_ray.direction.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
			_ray.applyMatrix4( _invMatrix );

			// get the closest point to the ray on the globe in the global coordinate frame
			closestRayEllipsoidSurfacePointEstimate( _ray, ellipsoid, _vec );
			_vec.applyMatrix4( tilesGroup.matrixWorld );

			// get ortho camera info
			const orthoHeight = ( camera.top - camera.bottom );
			const orthoWidth = ( camera.right - camera.left );
			const orthoSize = Math.max( orthoHeight, orthoWidth );
			_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );

			// shift the point backwards based on the size of the size of the orthographic view
			_vec.addScaledVector( _forward, - orthoSize ).applyMatrix4( _invMatrix );
			ellipsoid.getPositionToNormal( _vec, target );
			target.transformDirection( tilesGroup.matrixWorld );

		} else {

			this.getUpDirection( camera.position, target );

		}

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
			this.scaleZoomOrientationAtEdges = this.zoomDelta < 0;

		} else {

			if ( this.state !== NONE && this._dragMode !== 1 && this._rotationMode !== 1 ) {

				pivotMesh.visible = false;

			}
			this.reorientOnDrag = false;
			this.scaleZoomOrientationAtEdges = false;

		}

		// fire basic controls update
		super.update();

		// clamp the camera distance
		let distanceToCenter = this.getDistanceToCenter();
		const maxDistance = this._getMaxPerspectiveDistance();
		if ( distanceToCenter > maxDistance ) {

			_vec.setFromMatrixPosition( tilesGroup.matrixWorld ).sub( camera.position ).normalize().multiplyScalar( - 1 );
			camera.position.setFromMatrixPosition( tilesGroup.matrixWorld ).addScaledVector( _vec, maxDistance );
			camera.updateMatrixWorld();

			distanceToCenter = maxDistance;

		}

		// update the camera planes
		this.updateCameraClipPlanes( camera, true );

	}

	// Updates the passed camera near and far clip planes to encapsulate the
	// ellipsoid from their current position.
	updateCameraClipPlanes( camera, updateOrthoPosition = false ) {

		const {
			tilesGroup,
			ellipsoid,
		} = this;

		if ( camera.isPerspectiveCamera ) {

			const distanceToCenter = _vec
				.setFromMatrixPosition( tilesGroup.matrixWorld )
				.sub( camera.position ).length();

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

			const distanceToCenter = - _vec.z;
			camera.near = distanceToCenter - Math.max( ...ellipsoid.radius ) * 1.1;
			camera.far = distanceToCenter;

			// adjust the position of the ortho camera such that the near value is 0
			if ( updateOrthoPosition && camera.near < 0 ) {

				camera.position.addScaledVector( _forward, camera.near );
				camera.far -= camera.near;
				camera.near = 0;
				camera.updateMatrixWorld();

			}

			camera.updateProjectionMatrix();

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
			let scaleAmount;
			if ( camera.isPerspectiveCamera ) {

				scaleAmount = camera.position.distanceTo( pivotPoint ) * 5 * 1e-10 / devicePixelRatio;

			} else {

				scaleAmount = MathUtils.mapLinear(
					camera.zoom,
					this._getOrthographicTransitionZoom(),
					this._getMinOrthographicZoom(),
					0.001,
					0.005,
				);

			}

			pointerTracker.getCenterPoint( _pointer );
			pointerTracker.getPreviousCenterPoint( _prevPointer );
			_deltaPointer
				.subVectors( _pointer, _prevPointer )
				.multiplyScalar( scaleAmount );

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

		const { zoomDelta, ellipsoid, zoomSpeed, zoomPoint, camera, maxZoom } = this;
		if ( this._isNearControls() || zoomDelta > 0 ) {

			// When zooming try to tilt the camera towards the center of the planet to avoid the globe
			// spinning as you zoom out from the horizon
			if ( zoomDelta < 0 ) {

				// get the forward vector and vector toward the center of the ellipsoid
				_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld ).normalize();
				_toCenter.copy( this.up ).multiplyScalar( - 1 );

				// Calculate alpha values to use to scale the amount of tilt that occurs as the camera moves.
				// Scales based on mouse position near the horizon and current tilt.
				this.getUpDirection( zoomPoint, _zoomPointUp );
				const upAlpha = MathUtils.clamp( MathUtils.mapLinear( - _zoomPointUp.dot( _toCenter ), 1, 0.95, 0, 1 ), 0, 1 );
				const forwardAlpha = 1 - _forward.dot( _toCenter );
				const cameraAlpha = camera.isOrthographicCamera ? 0.05 : 1;

				// apply scale
				_toCenter.lerpVectors( _forward, _toCenter, upAlpha * forwardAlpha * cameraAlpha ).normalize();

				// perform rotation
				_quaternion.setFromUnitVectors( _forward, _toCenter );
				makeRotateAroundPoint( zoomPoint, _quaternion, _rotMatrix );
				camera.matrixWorld.premultiply( _rotMatrix );
				camera.matrixWorld.decompose( camera.position, camera.quaternion, _toCenter );

				// update zoom direction
				this.zoomDirection.subVectors( zoomPoint, camera.position ).normalize();

			}

			super._updateZoom();

		} else if ( camera.isPerspectiveCamera ) {

			// orient the camera to focus on the earth during the zoom
			const transitionDistance = this._getPerspectiveTransitionDistance();
			const maxDistance = this._getMaxPerspectiveDistance();
			const alpha = MathUtils.mapLinear( this.getDistanceToCenter(), transitionDistance, maxDistance, 0, 1 );
			this._tiltTowardsCenter( MathUtils.lerp( 0, 0.2, alpha ) );
			this._alignCameraUpToNorth( MathUtils.lerp( 0, 0.1, alpha ) );

			// calculate zoom in a similar way to environment controls so
			// the zoom speeds are comparable
			const dist = this.getDistanceToCenter() - ellipsoid.radius.x;
			const scale = zoomDelta * dist * zoomSpeed * 0.0025;

			// zoom out directly from the globe center
			this.getVectorToCenter( _vec ).normalize();
			this.camera.position.addScaledVector( _vec, scale );
			this.camera.updateMatrixWorld();

			this.zoomDelta = 0;

		} else {

			const transitionZoom = this._getOrthographicTransitionZoom();
			const minZoom = this._getMinOrthographicZoom();
			const alpha = MathUtils.mapLinear( camera.zoom, transitionZoom, minZoom, 0, 1 );
			this._tiltTowardsCenter( MathUtils.lerp( 0, 0.2, alpha ) );
			this._alignCameraUpToNorth( MathUtils.lerp( 0, 0.1, alpha ) );

			const scale = this.zoomDelta;
			const normalizedDelta = Math.pow( 0.95, Math.abs( scale * 0.05 ) );
			const scaleFactor = scale > 0 ? 1 / Math.abs( normalizedDelta ) : normalizedDelta;

			camera.zoom = Math.max( this._getMinOrthographicZoom(), Math.min( maxZoom, camera.zoom * scaleFactor * zoomSpeed ) );
			camera.updateProjectionMatrix();

			this.zoomDelta = 0;
			this.zoomDirectionSet = false;

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

		const { camera, ellipsoid } = this;
		if ( ! camera.isPerspectiveCamera ) {

			throw new Error();

		}

		// When the smallest fov spans 65% of the ellipsoid then we use the near controls
		const ellipsoidRadius = Math.max( ...ellipsoid.radius );
		const fovHoriz = 2 * Math.atan( Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 ) * camera.aspect );
		const distVert = ellipsoidRadius / Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 );
		const distHoriz = ellipsoidRadius / Math.tan( fovHoriz * 0.5 );
		const dist = Math.min( distVert, distHoriz );

		return dist;

	}

	_getMaxPerspectiveDistance() {

		const { camera, ellipsoid } = this;
		if ( ! camera.isPerspectiveCamera ) {

			return MAX_GLOBE_DISTANCE;

		}

		// allow for zooming out such that the ellipsoid is half the size of the largest fov
		const ellipsoidRadius = Math.max( ...ellipsoid.radius );
		const fovHoriz = 2 * Math.atan( Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 ) * camera.aspect );
		const distVert = ellipsoidRadius / Math.tan( MathUtils.DEG2RAD * camera.fov * 0.5 );
		const distHoriz = ellipsoidRadius / Math.tan( fovHoriz * 0.5 );
		const dist = 2 * Math.max( distVert, distHoriz );

		return dist;

	}

	_getOrthographicTransitionZoom() {

		const { camera, ellipsoid } = this;
		const orthoHeight = ( camera.top - camera.bottom );
		const orthoWidth = ( camera.right - camera.left );
		const orthoSize = Math.max( orthoHeight, orthoWidth );
		const ellipsoidRadius = Math.max( ...ellipsoid.radius );
		const ellipsoidDiameter = 2 * ellipsoidRadius;
		return 2 * orthoSize / ellipsoidDiameter;

	}

	_getMinOrthographicZoom() {

		const { camera, ellipsoid } = this;
		const orthoHeight = ( camera.top - camera.bottom );
		const orthoWidth = ( camera.right - camera.left );
		const orthoSize = Math.max( orthoHeight, orthoWidth );
		const ellipsoidRadius = Math.max( ...ellipsoid.radius );
		const ellipsoidDiameter = 2 * ellipsoidRadius;
		return 0.5 * orthoSize / ellipsoidDiameter;

	}

	_isNearControls() {

		const { camera } = this;
		if ( camera.isPerspectiveCamera ) {

			return this.getDistanceToCenter() < this._getPerspectiveTransitionDistance();

		} else {

			return camera.zoom > this._getOrthographicTransitionZoom();

		}

	}

}
