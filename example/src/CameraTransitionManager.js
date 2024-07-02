import { Clock, EventDispatcher, MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

const _forward = new Vector3();
const _vec = new Vector3();
const _targetPos = new Vector3();

function easeInOut( x ) {

	// https://stackoverflow.com/questions/30007853/simple-easing-function-in-javascript
	return 1 - ( ( Math.cos( Math.PI * x ) + 1 ) / 2 );

}

export class CameraTransitionManager extends EventDispatcher {

	get animating() {

		return this._alpha !== 0 && this._alpha !== 1;

	}

	get camera() {

		if ( this._alpha === 0 ) return this.perspectiveCamera;
		if ( this._alpha === 1 ) return this.orthographicCamera;
		return this.transitionCamera;

	}

	constructor( perspectiveCamera = new PerspectiveCamera(), orthographicCamera = new OrthographicCamera() ) {

		super();

		this.perspectiveCamera = perspectiveCamera;
		this.orthographicCamera = orthographicCamera;
		this.transitionCamera = new PerspectiveCamera();

		// settings
		this.orthographicPositionalZoom = true;
		this.orthographicOffset = 50;
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

			this.dispatchEvent( { type: 'camera-changed', camera: newCamera, prevCamera: prevCamera } );

		}

	}

	_syncCameras() {

		const fromCamera = this._getFromCamera();
		const { perspectiveCamera, orthographicCamera, transitionCamera } = this;

		_forward.set( 0, 0, - 1 ).transformDirection( fromCamera.matrixWorld ).normalize();

		if ( fromCamera.isPerspectiveCamera ) {

			// offset the orthographic camera backwards based on user setting to avoid cases where the ortho
			// camera position will clip into terrain when once transitioned
			orthographicCamera.position.copy( perspectiveCamera.position ).addScaledVector( _forward, - this.orthographicOffset );
			orthographicCamera.rotation.copy( perspectiveCamera.rotation );
			orthographicCamera.updateMatrixWorld();

			// calculate the necessary orthographic zoom based on the current perspective camera position
			const distToPoint = Math.abs( _vec.subVectors( perspectiveCamera.position, this.fixedPoint ).dot( _forward ) );
			const projectionHeight = 2 * Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 ) * distToPoint;
			const orthoHeight = orthographicCamera.top - orthographicCamera.bottom;
			orthographicCamera.zoom = orthoHeight / projectionHeight;
			orthographicCamera.updateProjectionMatrix();

		} else {

			// calculate the target distance from the point
			const distToPoint = Math.abs( _vec.subVectors( orthographicCamera.position, this.fixedPoint ).dot( _forward ) );
			const orthoHeight = ( orthographicCamera.top - orthographicCamera.bottom ) / orthographicCamera.zoom;
			const targetDist = orthoHeight * 0.5 / Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 );

			// set the final camera position so the pivot point is stable
			perspectiveCamera.rotation.copy( orthographicCamera.rotation );
			perspectiveCamera.position.copy( orthographicCamera.position )
				.addScaledVector( _forward, distToPoint )
				.addScaledVector( _forward, - targetDist );

			perspectiveCamera.updateMatrixWorld();

			// shift the orthographic camera position so it aligns with the perspective cameras position as
			// calculated by the FoV. This ensures a consistent orthographic position on transition.
			if ( this.orthographicPositionalZoom ) {

				orthographicCamera.position.copy( perspectiveCamera.position ).addScaledVector( _forward, - this.orthographicOffset );
				orthographicCamera.updateMatrixWorld();

			}

		}

		transitionCamera.position.copy( perspectiveCamera.position );
		transitionCamera.rotation.copy( perspectiveCamera.rotation );

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

		const { perspectiveCamera, orthographicCamera, transitionCamera, fixedPoint } = this;
		const alpha = easeInOut( this._alpha );

		// get the forward vector
		_forward.set( 0, 0, - 1 ).transformDirection( perspectiveCamera.matrixWorld ).normalize();

		// compute the projection height based on the perspective camera
		const distToPoint = Math.abs( _vec.subVectors( perspectiveCamera.position, fixedPoint ).dot( _forward ) );
		const projectionHeight = 2 * Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 ) * distToPoint;

		// Perform transition interpolation between the orthographic and perspective camera

		// alpha === 0 : perspective
		// alpha === 1 : orthographic

		// calculate the target distance and fov to position the camera at
		const targetFov = MathUtils.lerp( perspectiveCamera.fov, 1, alpha );
		const targetDistance = projectionHeight * 0.5 / Math.tan( MathUtils.DEG2RAD * targetFov * 0.5 );

		// calculate all distance to the focus point
		const perspDistanceToPoint = Math.abs( _vec.subVectors( perspectiveCamera.position, fixedPoint ).dot( _forward ) );
		const orthoDistanceToPoint = Math.abs( _vec.subVectors( orthographicCamera.position, fixedPoint ).dot( _forward ) );

		// find the target near and far positions
		const perspNearPlane = perspDistanceToPoint - perspectiveCamera.near;
		const orthoNearPlane = orthoDistanceToPoint - orthographicCamera.near;
		const targetNearPlane = MathUtils.lerp( perspNearPlane, orthoNearPlane, alpha );

		const perspFarPlane = perspDistanceToPoint - perspectiveCamera.far;
		const orthoFarPlane = orthoDistanceToPoint - orthographicCamera.far;
		const targetFarPlane = MathUtils.lerp( perspFarPlane, orthoFarPlane, alpha );

		// work from an interpolated transition point for the camera position
		_targetPos.lerpVectors( perspectiveCamera.position, orthographicCamera.position, alpha );
		const transDistanceToPoint = Math.abs( _vec.subVectors( _targetPos, fixedPoint ).dot( _forward ) );

		// update the camera state
		transitionCamera.aspect = perspectiveCamera.aspect;
		transitionCamera.fov = targetFov;
		transitionCamera.near = Math.max( targetDistance - targetNearPlane, 1e-4 );
		transitionCamera.far = targetDistance - targetFarPlane;
		transitionCamera.position.copy( _targetPos ).addScaledVector( _forward, transDistanceToPoint - targetDistance );
		transitionCamera.rotation.copy( perspectiveCamera.rotation );

		transitionCamera.updateProjectionMatrix();
		transitionCamera.updateMatrixWorld();

	}

}
