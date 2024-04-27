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
		this.duration = 1000;
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
		[ perspectiveCamera, orthographicCamera, transitionCamera ].forEach( c => {

			c.position.copy( camera.position );
			c.rotation.copy( camera.rotation );

		} );

		if ( camera === transitionCamera ) {

			this._updateTransitionCamera();
			perspectiveCamera.position.copy( camera.position );
			perspectiveCamera.rotation.copy( camera.rotation );
			orthographicCamera.position.copy( camera.position );
			orthographicCamera.rotation.copy( camera.rotation );

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

	_updateTransitionCamera() {

		const { perspectiveCamera, orthographicCamera, transitionCamera } = this;
		const alpha = this._alpha;

		// a = o / tan
		const fov = MathUtils.lerp( perspectiveCamera.fov, 1e-8, alpha );
		let height = ( orthographicCamera.top - orthographicCamera.bottom ) / orthographicCamera.zoom;

		_forward.set( 0, 0, - 1 ).transformDirection( transitionCamera.matrixWorld ).normalize();

		// tan = o / a
		// o = tan * a
		const currDist = Math.abs( _vec.subVectors( perspectiveCamera.position, this.fixedPoint ).dot( _forward ) );
		const currHeight = Math.tan( MathUtils.DEG2RAD * perspectiveCamera.fov * 0.5 ) * currDist;
		// height = currHeight;

		const distance = height * 0.5 / Math.tan( MathUtils.DEG2RAD * fov * 0.5 );

		transitionCamera.aspect = perspectiveCamera.aspect;
		transitionCamera.fov = fov;
		transitionCamera.position.copy( this.fixedPoint ).addScaledVector( _forward, - distance );
		transitionCamera.updateProjectionMatrix();

		console.log( currHeight )

	}

}
