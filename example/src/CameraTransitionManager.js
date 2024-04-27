import { Clock, EventDispatcher, MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

const _forward = new Vector3();
const _vec = new Vector3();
export class CameraTransitionManager extends EventDispatcher {

	constructor( perspectiveCamera = new PerspectiveCamera(), orthographicCamera = new OrthographicCamera() ) {

		super();

		this.perspectiveCamera = perspectiveCamera;
		this.orthographicCamera = orthographicCamera;
		this.transitionCamera = new PerspectiveCamera();
		this.camera = this.perspectiveCamera;

		this.fixedPoint = new Vector3();
		this.duration = 500;
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

		if ( this._alpha !== this._target ) {

			const direction = Math.sign( this._target - this._alpha );
			const step = direction * delta / this.duration;
			this._alpha = MathUtils.clamp( this._alpha + step, 0, 1 );

			this.dispatchEvent( { type: 'change' } );

		}

		// update transforms
		this._syncCameras();

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

			orthographicCamera.position.copy( fromCamera.position );
			orthographicCamera.rotation.copy( fromCamera.rotation );
			orthographicCamera.updateMatrixWorld();

			const distToPoint = Math.abs( _vec.subVectors( fromCamera.position, this.fixedPoint ).dot( _forward ) );
			const projectionHeight = 2 * Math.tan( MathUtils.DEG2RAD * fromCamera.fov * 0.5 ) * distToPoint;
			const orthoHeight = orthographicCamera.top - orthographicCamera.bottom;
			orthographicCamera.zoom = orthoHeight / projectionHeight;
			orthographicCamera.updateProjectionMatrix();

		} else {

			const orthoHeight = ( orthographicCamera.top - orthographicCamera.bottom ) / orthographicCamera.zoom;
			const distToPoint = orthoHeight * 0.5 / Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 );

			perspectiveCamera.rotation.copy( fromCamera.rotation );
			perspectiveCamera.position.copy( this.fixedPoint ).addScaledVector( _forward, - distToPoint );
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
		const alpha = this._alpha;
		const fromCamera = this._getFromCamera();

		// a = o / tan
		const fov = MathUtils.lerp( perspectiveCamera.fov, 1, alpha );
		transitionCamera.rotation.copy( fromCamera.rotation );
		_forward.set( 0, 0, - 1 ).transformDirection( fromCamera.matrixWorld ).normalize();

		let projectionHeight;
		if ( fromCamera.isPerspectiveCamera ) {

			const distToPoint = Math.abs( _vec.subVectors( perspectiveCamera.position, this.fixedPoint ).dot( _forward ) );
			projectionHeight = 2 * Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 ) * distToPoint;

		} else {

			projectionHeight = ( orthographicCamera.top - orthographicCamera.bottom ) / orthographicCamera.zoom;

		}

		const distance = projectionHeight * 0.5 / Math.tan( MathUtils.DEG2RAD * fov * 0.5 );

		transitionCamera.aspect = perspectiveCamera.aspect;
		transitionCamera.fov = fov;
		transitionCamera.near = perspectiveCamera.near;
		transitionCamera.far = perspectiveCamera.far;
		transitionCamera.position.copy( this.fixedPoint ).addScaledVector( _forward, - distance );
		transitionCamera.updateProjectionMatrix();

	}

}
