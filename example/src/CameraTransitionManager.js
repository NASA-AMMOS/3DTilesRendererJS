import { Clock, EventDispatcher, MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

const _forward = new Vector3();
const _vec = new Vector3();
const _targetPos = new Vector3();
const OFFSET = 0;

function easeInOut( x ) {

	// https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript
	return 1 - ( ( Math.cos( Math.PI * x ) + 1 ) / 2 );

}

export class CameraTransitionManager extends EventDispatcher {

	get animating() {

		return this._alpha !== 0 && this._alpha !== 1;

	}

	constructor( perspectiveCamera = new PerspectiveCamera(), orthographicCamera = new OrthographicCamera() ) {

		super();

		this.perspectiveCamera = perspectiveCamera;
		this.orthographicCamera = orthographicCamera;
		this.transitionCamera = new PerspectiveCamera();
		this.camera = this.perspectiveCamera;

		this.fixedPoint = new Vector3();
		this.duration = 200;
		this._target = 0;
		this._alpha = 0;
		this._clock = new Clock();

	}

	toggle() {

		this._target = this._target === 1 ? 0 : 1;

	}

	update() {

		const { perspectiveCamera, orthographicCamera, transitionCamera, camera } = this;
		const clock = this._clock;
		const delta = clock.getDelta() * 1e3;

		// update transforms
		this._syncCameras();

		if ( this._alpha !== this._target ) {

			const direction = Math.sign( this._target - this._alpha );
			const step = direction * delta / this.duration;
			this._alpha = MathUtils.clamp( this._alpha + step, 0, 1 );

			this.dispatchEvent( { type: 'change' } );

		}

		// find the new camera
		const prevCamera = camera;
		let newCamera = null;
		if ( this._alpha === 0 ) {

			newCamera = perspectiveCamera;

		} else if ( this._alpha === 1 ) {

			newCamera = orthographicCamera;

		} else {

			newCamera = transitionCamera;
			this._updateTransitionCamera();

		}

		if ( prevCamera !== newCamera ) {

			this.camera = newCamera;
			this.dispatchEvent( { type: 'camera-changed', camera: newCamera, prevCamera: prevCamera } );

		}

	}

	_syncCameras() {

		const fromCamera = this._getFromCamera();
		const { perspectiveCamera, orthographicCamera, transitionCamera } = this;

		transitionCamera.position.copy( fromCamera.position );
		transitionCamera.rotation.copy( fromCamera.rotation );

		_forward.set( 0, 0, - 1 ).transformDirection( fromCamera.matrixWorld ).normalize();

		if ( fromCamera.isPerspectiveCamera ) {

			// offset the orthographic camera backwards
			orthographicCamera.position.copy( fromCamera.position ).addScaledVector( _forward, - OFFSET );
			orthographicCamera.rotation.copy( fromCamera.rotation );
			orthographicCamera.updateMatrixWorld();

			// calculate the necessary orthographic zoom based on the current perspective camera position
			const distToPoint = Math.abs( _vec.subVectors( fromCamera.position, this.fixedPoint ).dot( _forward ) );
			const projectionHeight = 2 * Math.tan( MathUtils.DEG2RAD * fromCamera.fov * 0.5 ) * distToPoint;
			const orthoHeight = orthographicCamera.top - orthographicCamera.bottom;
			orthographicCamera.zoom = orthoHeight / projectionHeight;
			orthographicCamera.updateProjectionMatrix();

		} else {

			// calculate the target distance from the point
			const distToPoint = Math.abs( _vec.subVectors( fromCamera.position, this.fixedPoint ).dot( _forward ) );
			const orthoHeight = ( orthographicCamera.top - orthographicCamera.bottom ) / orthographicCamera.zoom;
			const targetDist = orthoHeight * 0.5 / Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 );

			// set the final camera position so the pivot point is stable
			perspectiveCamera.rotation.copy( fromCamera.rotation );
			perspectiveCamera.position.copy( fromCamera.position )
				.addScaledVector( _forward, distToPoint )
				.addScaledVector( _forward, - targetDist );

			perspectiveCamera.updateMatrixWorld();

		}

	}

	_getTransitionDirection() {

		return Math.sign( this._target - this._alpha );

	}

	_getToCamera() {

		const dir = this._getTransitionDirection();
		if ( dir === 0 ) {

			return this._target === 0 ? this.perspectiveCamera : this.orthographicCamera;

		} else if ( dir > 0 ) {

			return this.orthographicCamera;

		} else {

			return this.perspectiveCamera;

		}

	}

	_getFromCamera() {

		const dir = this._getTransitionDirection();
		if ( dir === 0 ) {

			return this._target === 0 ? this.perspectiveCamera : this.orthographicCamera;

		} else if ( dir > 0 ) {

			return this.perspectiveCamera;

		} else {

			return this.orthographicCamera;

		}

	}

	_updateTransitionCamera() {

		const { perspectiveCamera, orthographicCamera, transitionCamera } = this;
		const alpha = easeInOut( this._alpha );
		const fromCamera = this._getFromCamera();
		const toCamera = fromCamera === perspectiveCamera ? orthographicCamera : perspectiveCamera;

		// get the forward vector
		_forward.set( 0, 0, - 1 ).transformDirection( fromCamera.matrixWorld ).normalize();

		// compute the projection height based on the current camera
		let projectionHeight;
		if ( fromCamera.isPerspectiveCamera ) {

			const distToPoint = Math.abs( _vec.subVectors( perspectiveCamera.position, this.fixedPoint ).dot( _forward ) );
			projectionHeight = 2 * Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 ) * distToPoint;

		} else {

			projectionHeight = ( orthographicCamera.top - orthographicCamera.bottom ) / orthographicCamera.zoom;

		}

		// alpha === 0 : perspective
		// alpha === 1 : orthographic

		// calculate the target distance and fov to position the camera at
		const targetFov = MathUtils.lerp( perspectiveCamera.fov, 1, alpha );
		const targetDistance = projectionHeight * 0.5 / Math.tan( MathUtils.DEG2RAD * targetFov * 0.5 );

		_targetPos.lerpVectors( fromCamera.position, toCamera.position, alpha );

		// calculate all distance to the focus point
		const fromDistanceToPoint = Math.abs( _vec.subVectors( fromCamera.position, this.fixedPoint ).dot( _forward ) );
		const toDistanceToPoint = Math.abs( _vec.subVectors( toCamera.position, this.fixedPoint ).dot( _forward ) );

		// find the target near and far positions
		const fromNearPlane = fromDistanceToPoint - fromCamera.near;
		const toNearPlane = toDistanceToPoint - toCamera.near;
		const targetNearPlane = MathUtils.lerp( fromNearPlane, toNearPlane, alpha );

		const fromFarPlane = fromDistanceToPoint - fromCamera.far;
		const toFarPlane = toDistanceToPoint - toCamera.far;
		const targetFarPlane = MathUtils.lerp( fromFarPlane, toFarPlane, alpha );

		// work from an interpolated transition point for the camera position
		const transDistanceToPoint = Math.abs( _vec.subVectors( _targetPos, this.fixedPoint ).dot( _forward ) );

		// update the camera state
		transitionCamera.aspect = perspectiveCamera.aspect;
		transitionCamera.fov = targetFov;
		transitionCamera.near = Math.max( targetDistance - targetNearPlane, 1 );
		transitionCamera.far = targetDistance - targetFarPlane;
		transitionCamera.position.copy( _targetPos ).addScaledVector( _forward, transDistanceToPoint - targetDistance );
		transitionCamera.rotation.copy( fromCamera.rotation );

		transitionCamera.updateProjectionMatrix();
		transitionCamera.updateMatrixWorld();

	}

}
