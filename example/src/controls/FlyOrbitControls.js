import { Clock, Vector3, Vector4 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const changeEvent = { type: 'fly-change' };
const startEvent = { type: 'fly-start' };
const endEvent = { type: 'fly-end' };
const tempVector = new Vector4( 0, 0, 0, 0 );
export class FlyOrbitControls extends OrbitControls {

	constructor( camera, domElement ) {

		// Disable use of shift key so we can use it for acceleration
		const disableShiftKeyCallback = e => {

			if ( this.enabled ) {

				Object.defineProperty( e, 'shiftKey', { get() {

					return false;

				} } );

			}

		};

		domElement.addEventListener( 'pointerdown', disableShiftKeyCallback );

		super( camera, domElement );

		this.enableKeys = false;
		this.enableFlight = true;
		this.baseSpeed = 1;
		this.fastSpeed = 4;
		this.forwardKey = 'w';
		this.backKey = 's';
		this.leftKey = 'a';
		this.rightKey = 'd';
		this.upKey = 'q';
		this.downKey = 'e';
		this.fastKey = 'shift';

		let fastHeld = false;
		let forwardHeld = false;
		let backHeld = false;
		let leftHeld = false;
		let rightHeld = false;
		let upHeld = false;
		let downHeld = false;

		let originalDistance = 0;
		let originalMinDistance = 0;
		let originalMaxDistance = 0;
		let rafHandle = - 1;
		const originalTarget = new Vector3();
		const clock = new Clock();

		const endFlight = () => {

			if ( rafHandle !== - 1 ) {

				// cancel the animation playing
				cancelAnimationFrame( rafHandle );
				rafHandle = - 1;

				// store the original distances for the controls
				this.minDistance = originalMinDistance;
				this.maxDistance = originalMaxDistance;

				const targetDistance = Math.min( originalDistance, camera.position.distanceTo( originalTarget ) );
				tempVector
					.set( 0, 0, - 1, 0 )
					.applyMatrix4( camera.matrixWorld );
				this
					.target
					.copy( camera.position )
					.addScaledVector( tempVector, targetDistance );

				this.dispatchEvent( endEvent );

			}

		};

		const updateFlight = () => {

			if ( ! this.enabled || ! this.enableFlight ) {

				return;

			}

			rafHandle = requestAnimationFrame( updateFlight );

			// get the direction
			tempVector.set( 0, 0, 0, 0 );
			if ( forwardHeld ) tempVector.z -= 1;
			if ( backHeld ) tempVector.z += 1;
			if ( leftHeld ) tempVector.x -= 1;
			if ( rightHeld ) tempVector.x += 1;
			if ( upHeld ) tempVector.y += 1;
			if ( downHeld ) tempVector.y -= 1;
			tempVector.applyMatrix4( camera.matrixWorld );

			// apply the movement
			const delta = 60 * clock.getDelta();
			const speed = fastHeld ? this.fastSpeed : this.baseSpeed;
			camera
				.position
				.addScaledVector( tempVector, speed * delta );
			this
				.target
				.addScaledVector( tempVector, speed * delta );

			this.dispatchEvent( changeEvent );

		};

		const keyDownCallback = e => {

			const key = e.key.toLowerCase();

			if ( rafHandle === - 1 ) {

				originalMaxDistance = this.maxDistance;
				originalMinDistance = this.minDistance;
				originalDistance = camera.position.distanceTo( this.target );
				originalTarget.copy( this.target );

			}

			switch ( key ) {

				case this.forwardKey:
					forwardHeld = true;
					break;
				case this.backKey:
					backHeld = true;
					break;
				case this.leftKey:
					leftHeld = true;
					break;
				case this.rightKey:
					rightHeld = true;
					break;
				case this.upKey:
					upHeld = true;
					break;
				case this.downKey:
					downHeld = true;
					break;
				case this.fastKey:
					fastHeld = true;
					break;

			}

			switch ( key ) {

				case this.fastKey:
				case this.forwardKey:
				case this.backKey:
				case this.leftKey:
				case this.rightKey:
				case this.upKey:
				case this.downKey:
					e.stopPropagation();
					e.preventDefault();

			}

			if ( forwardHeld || backHeld || leftHeld || rightHeld || upHeld || downHeld || fastHeld ) {

				this.minDistance = 0.01;
				this.maxDistance = 0.01;

				// Move the orbit target out to just in front of the camera
				tempVector
					.set( 0, 0, - 1, 0 )
					.applyMatrix4( camera.matrixWorld );
				this
					.target
					.copy( camera.position )
					.addScaledVector( tempVector, 0.01 );

				if ( rafHandle === - 1 ) {

					// start the flight and reset the clock
					this.dispatchEvent( startEvent );
					clock.getDelta();
					updateFlight();

				}

			}

		};

		const keyUpCallback = e => {

			const key = e.key.toLowerCase();

			switch ( key ) {

				case this.fastKey:
				case this.forwardKey:
				case this.backKey:
				case this.leftKey:
				case this.rightKey:
				case this.upKey:
				case this.downKey:
					e.stopPropagation();
					e.preventDefault();

			}

			switch ( key ) {

				case this.forwardKey:
					forwardHeld = false;
					break;
				case this.backKey:
					backHeld = false;
					break;
				case this.leftKey:
					leftHeld = false;
					break;
				case this.rightKey:
					rightHeld = false;
					break;
				case this.upKey:
					upHeld = false;
					break;
				case this.downKey:
					downHeld = false;
					break;
				case this.fastKey:
					fastHeld = false;
					break;

			}

			if ( ! ( forwardHeld || backHeld || leftHeld || rightHeld || upHeld || downHeld || fastHeld ) ) {

				endFlight();

			}

		};

		const blurCallback = () => {

			endFlight();

		};

		this.blurCallback = blurCallback;
		this.keyDownCallback = keyDownCallback;
		this.keyUpCallback = keyUpCallback;
		this.disableShiftKeyCallback = disableShiftKeyCallback;

		this.domElement.addEventListener( 'blur', blurCallback );
		this.domElement.addEventListener( 'keydown', keyDownCallback );
		this.domElement.addEventListener( 'keyup', keyUpCallback );

	}

	dispose() {

		super.dispose();

		this.domElement.removeEventListener( 'blur', this.blurCallback );
		this.domElement.removeEventListener( 'keydown', this.keyDownCallback );
		this.domElement.removeEventListener( 'keyup', this.keyUpCallback );
		this.domElement.removeEventListener( 'pointerdown', this.disableShiftKeyCallback );

	}

}
