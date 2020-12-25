import { Vector3, Vector4 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const tempVector = new Vector4( 0, 0, 0, 0 );
export class FlyOrbitControls extends OrbitControls {

	constructor( camera, domElement ) {

		super( camera, domElement );

		domElement.tabIndex = 1;

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

		let originalDistance = 0
		let originalMinDistance = 0;
		let originalMaxDistance = 0;
		let rafHandle = - 1;
		const originalTarget = new Vector3();

		const endFlight = () => {

			if ( rafHandle !== - 1 ) {

				cancelAnimationFrame( rafHandle );
				rafHandle = - 1;

			}

			this.minDistance = originalMinDistance;
			this.maxDistance = originalMaxDistance;

			const targetDistance = Math.min( originalDistance, camera.position.distanceTo( originalTarget ) );
			this
				.target
				.set( 0, 0, - targetDistance )
				.applyMatrix4( camera.matrixWorld );

		};

		const updateFlight = () => {

			rafHandle = requestAnimationFrame( updateFlight );

			const speed = fastHeld ? this.fastSpeed : this.baseSpeed;
			tempVector.set( 0, 0, 0, 0 );
			if ( forwardHeld ) tempVector.z -= 1;
			if ( backHeld ) tempVector.z += 1;
			if ( leftHeld ) tempVector.x -= 1;
			if ( rightHeld ) tempVector.x += 1;
			if ( upHeld ) tempVector.y += 1;
			if ( downHeld ) tempVector.y -= 1;

			tempVector.applyMatrix4( camera.matrixWorld );
			camera
				.position
				.addScaledVector( tempVector, speed );
			this
				.target
				.addScaledVector( tempVector, speed );

		};
		this.updateFlight = updateFlight;

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

			if ( forwardHeld || backHeld || leftHeld || rightHeld || upHeld || downHeld ) {

				this.minDistance = 0.01;
				this.maxDistance = 0.01;

				tempVector.set( 0, 0, - 1, 0 ).applyMatrix4( camera.matrixWorld );
				this.target.copy( camera.position ).addScaledVector( tempVector, 0.01 );

				if ( rafHandle === - 1 ) {

					updateFlight();

				}

			}

		};

		const keyUpCallback = e => {

			const key = e.key.toLowerCase();

			switch( key ) {

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

			if ( ! ( forwardHeld || backHeld || leftHeld || rightHeld || upHeld || downHeld ) ) {

				endFlight();

			}

		};

		const blurCallback = () => {

			endFlight();

		};

		this.blurCallback = blurCallback;
		this.keyDownCallback = keyDownCallback;
		this.keyUpCallback = keyUpCallback;

		this.domElement.addEventListener( 'blur', blurCallback );
		this.domElement.addEventListener( 'keydown', keyDownCallback );
		this.domElement.addEventListener( 'keyup', keyUpCallback );

	}

	dispose() {

		super.dispose();

		this.domElement.addEventListener( 'blur', this.blurCallback );
		this.domElement.addEventListener( 'keydown', this.keyDownCallback );
		this.domElement.addEventListener( 'keyup', this.keyUpCallback );

	}


}
