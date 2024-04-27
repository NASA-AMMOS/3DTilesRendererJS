import { Clock, EventDispatcher, MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

export class CameraTransitionManager extends EventDispatcher {

	constructor( perspectiveCamera = new PerspectiveCamera(), orthographicCamera = new OrthographicCamera() ) {

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

		const clock = this._clock;
		const delta = clock.getDelta() * 1e3;

		if ( this._alpha !== this._target ) {

			const direction = Math.sign( this._alpha - this._target );
			const step = direction * delta / this._duration;
			this._alpha = MathUtils.clamp( this._alpha + step, 0, 1 );

			const prevCamera = this.camera;
			let newCamera = null;
			if ( this._alpha === 0 ) {

				newCamera = this.perspectiveCamera;

			} else if ( this._alpha === 1 ) {

				newCamera = this.orthographicCamera;

			} else {

				newCamera = this.transitionCamera;
				newCamera.copy( this.perspectiveCamera );

				// TODO: transition

			}

			if ( prevCamera !== newCamera ) {

				this.camera = newCamera;
				this.dispatchEvent( { type: 'camera-changed', camera: newCamera, prevCamera: prevCamera } );

			}

			this.dispatchEvent( { type: 'change' } );

		}

	}

}
