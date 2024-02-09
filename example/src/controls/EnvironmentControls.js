import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	Raycaster,
	Plane,
	EventDispatcher,
} from 'three';
import { PivotPointMesh } from './PivotPointMesh.js';
import { PointerTracker } from './PointerTracker.js';
import { mouseToCoords, makeRotateAroundPoint } from './utils.js';

export const NONE = 0;
export const DRAG = 1;
export const ROTATE = 2;
export const ZOOM = 3;
export const WAITING = 4;

const DRAG_PLANE_THRESHOLD = 0.05;
const DRAG_UP_THRESHOLD = 0.025;

const _rotMatrix = new Matrix4();
const _delta = new Vector3();
const _vec = new Vector3();
const _forward = new Vector3();
const _right = new Vector3();
const _rotationAxis = new Vector3();
const _quaternion = new Quaternion();
const _plane = new Plane();
const _localUp = new Vector3();

const _pointer = new Vector2();
const _prevPointer = new Vector2();
const _deltaPointer = new Vector2();
const _centerPoint = new Vector2();
const _startCenterPoint = new Vector2();

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

export class EnvironmentControls extends EventDispatcher {

	get enabled() {

		return this._enabled || true;

	}

	set enabled( v ) {

		if ( v !== this.enabled ) {

			this.resetState();
			this.pointerTracker.reset();
			this._enabled = v;

		}

	}

	constructor( scene = null, camera = null, domElement = null ) {

		super();

		this.domElement = null;
		this.camera = null;
		this.scene = null;

		// settings
		this._enabled = true;
		this.state = NONE;
		this.pinchState = NONE;
		this.cameraRadius = 5;
		this.rotationSpeed = 5;
		this.minAltitude = 0;
		this.maxAltitude = 0.45 * Math.PI;
		this.minZoomDistance = 10;
		this.maxZoomDistance = Infinity;
		this.reorientOnDrag = true;
		this.reorientOnZoom = false;
		this.adjustHeight = true;

		// internal state
		this.pointerTracker = new PointerTracker();
		this.needsUpdate = false;
		this.actionHeightOffset = 0;

		this.dragPointSet = false;
		this.dragPoint = new Vector3();

		this.rotationPointSet = false;
		this.rotationPoint = new Vector3();

		this.zoomDirectionSet = false;
		this.zoomPointSet = false;
		this.zoomDirection = new Vector3();
		this.zoomPoint = new Vector3();
		this.zoomDelta = 0;

		this.pivotMesh = new PivotPointMesh();
		this.pivotMesh.raycast = () => {};
		this.pivotMesh.scale.setScalar( 0.25 );

		this.raycaster = new Raycaster();
		this.raycaster.firstHitOnly = true;

		this.up = new Vector3( 0, 1, 0 );

		this._detachCallback = null;
		this._upInitialized = false;

		// init
		this.attach( domElement );
		this.setCamera( camera );
		this.setScene( scene );

	}

	setScene( scene ) {

		this.scene = scene;

	}

	setCamera( camera ) {

		this.camera = camera;

	}

	attach( domElement ) {

		if ( this.domElement ) {

			throw new Error( 'EnvironmentControls: Controls already attached to element' );

		}

		// set the touch action to none so the browser does not
		// drag the page to refresh or scroll
		this.domElement = domElement;
		domElement.style.touchAction = 'none';

		let shiftClicked = false;

		const contextMenuCallback = e => {

			e.preventDefault();

		};

		const keydownCallback = e => {

			if ( e.key === 'Shift' ) {

				shiftClicked = true;

			}

		};

		const keyupCallback = e => {

			if ( e.key === 'Shift' ) {

				shiftClicked = false;

			}

		};

		const pointerdownCallback = e => {

			e.preventDefault();

			const {
				camera,
				raycaster,
				domElement,
				scene,
				up,
				pivotMesh,
				pointerTracker,
			} = this;

			// init the pointer
			pointerTracker.addPointer( e );
			this.needsUpdate = true;

			// handle cases where we need to capture the pointer or
			// reset state when we have too many pointers
			if ( pointerTracker.getPointerType() === 'touch' ) {

				pivotMesh.visible = false;

				if ( pointerTracker.getPointerCount() === 0 ) {

					domElement.setPointerCapture( e.pointerId );

				} else if ( pointerTracker.getPointerCount() > 2 ) {

					this.resetState();
					return;

				}

			}

			// the "pointer" for zooming and rotating should be based on the center point
			pointerTracker.getCenterPoint( _pointer );
			mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );

			// find the hit point
			raycaster.setFromCamera( _pointer, camera );
			const hit = raycaster.intersectObject( scene )[ 0 ] || null;
			if ( hit ) {

				// if two fingers, right click, or shift click are being used then we trigger
				// a rotation action to begin
				if (
					pointerTracker.getPointerCount() === 2 ||
					pointerTracker.isRightClicked() ||
					pointerTracker.isLeftClicked() && shiftClicked
				) {

					this.setState( ROTATE );
					this.rotationPoint.copy( hit.point );
					this.rotationPointSet = true;

					this.pivotMesh.position.copy( hit.point );
					this.pivotMesh.updateMatrixWorld();
					this.scene.add( this.pivotMesh );

				} else if ( pointerTracker.isLeftClicked() ) {

					// if the clicked point is coming from below the plane then don't perform the drag
					if ( raycaster.ray.direction.dot( up ) < 0 ) {

						this.setState( DRAG );
						this.dragPoint.copy( hit.point );
						this.dragPointSet = true;

						this.pivotMesh.position.copy( hit.point );
						this.pivotMesh.updateMatrixWorld();
						this.scene.add( this.pivotMesh );

					}

				}

			}

		};

		let _pointerMoveQueued = false;
		const pointermoveCallback = e => {

			e.preventDefault();

			// whenever the pointer moves we need to re-derive the zoom direction and point
			this.zoomDirectionSet = false;
			this.zoomPointSet = false;
			this.needsUpdate = true;

			const { pointerTracker } = this;
			pointerTracker.setHoverEvent( e );
			if ( ! pointerTracker.updatePointer( e ) ) {

				return;

			}

			if ( pointerTracker.getPointerType() === 'touch' ) {

				if ( pointerTracker.getPointerCount() === 2 ) {

					if ( this.state === DRAG ) {

						this.setState( NONE, WAITING, false );

					}

					// We queue this event to ensure that all pointers have been updated
					if ( ! _pointerMoveQueued ) {

						_pointerMoveQueued = true;
						queueMicrotask( () => {

							_pointerMoveQueued = false;

							// adjust the pointer position to be the center point
							pointerTracker.getCenterPoint( _centerPoint );

							// detect zoom transition
							const startDist = pointerTracker.getStartPointerDistance();
							const pointerDist = pointerTracker.getPointerDistance();
							const separateDelta = pointerDist - startDist;
							if ( this.pinchState === NONE || this.pinchState === WAITING ) {

								// check which direction was moved in first - if the pointers are pinching then
								// it's a zoom. But if they move in parallel it's a rotation
								pointerTracker.getCenterPoint( _centerPoint );
								pointerTracker.getStartCenterPoint( _startCenterPoint );

								// adjust the drag requirement by the dpr
								const dpr = window.devicePixelRatio;
								const parallelDelta = _centerPoint.distanceTo( _startCenterPoint );
								if ( Math.abs( separateDelta ) > dpr || parallelDelta > dpr ) {

									if ( Math.abs( separateDelta ) > parallelDelta ) {

										this.setState( NONE, ZOOM );
										this.zoomDirectionSet = false;

									} else {

										this.setState( NONE, ROTATE );

									}

								}

							}

							if ( this.pinchState === ZOOM ) {

								const previousDist = pointerTracker.getPreviousPointerDistance();
								this.zoomDelta += pointerDist - previousDist;

							} else if ( this.pinchState === ROTATE ) {

								this.pivotMesh.visible = true;

							}

						} );

					}

				}

			}

		};

		const pointerupCallback = e => {

			const { pointerTracker } = this;

			pointerTracker.deletePointer( e );

			if (
				pointerTracker.getPointerType() === 'touch' &&
				pointerTracker.getPointerCount() === 0
			) {

				domElement.releasePointerCapture( e.pointerId );

			}

			this.resetState();
			this.needsUpdate = true;

		};

		const wheelCallback = e => {

			e.preventDefault();

			let delta;
			switch ( e.deltaMode ) {

				case 2: // Pages
					delta = e.deltaY * 100;
					break;
				case 1: // Lines
					delta = e.deltaY * 16;
					break;
				case 0: // Pixels
					delta = e.deltaY;
					break;

			}

			// use LOG to scale the scroll delta and hopefully normalize them across platforms
			const deltaSign = Math.sign( delta );
			const normalizedDelta = Math.log( Math.abs( delta ) + 1 );
			this.zoomDelta -= 3 * deltaSign * normalizedDelta;
			this.needsUpdate = true;

		};

		const pointerenterCallback = e => {

			const { pointerTracker } = this;

			shiftClicked = false;

			if ( e.buttons !== pointerTracker.getPointerButtons() ) {

				pointerTracker.deletePointer( e );
				this.resetState();

			}

		};

		domElement.addEventListener( 'contextmenu', contextMenuCallback );
		domElement.addEventListener( 'keydown', keydownCallback );
		domElement.addEventListener( 'keyup', keyupCallback );
		domElement.addEventListener( 'pointerdown', pointerdownCallback );
		domElement.addEventListener( 'pointermove', pointermoveCallback );
		domElement.addEventListener( 'pointerup', pointerupCallback );
		domElement.addEventListener( 'wheel', wheelCallback );
		domElement.addEventListener( 'pointerenter', pointerenterCallback );

		this._detachCallback = () => {

			domElement.removeEventListener( 'contextmenu', contextMenuCallback );
			domElement.removeEventListener( 'keydown', keydownCallback );
			domElement.removeEventListener( 'keyup', keyupCallback );
			domElement.removeEventListener( 'pointerdown', pointerdownCallback );
			domElement.removeEventListener( 'pointermove', pointermoveCallback );
			domElement.removeEventListener( 'pointerup', pointerupCallback );
			domElement.removeEventListener( 'wheel', wheelCallback );
			domElement.removeEventListener( 'pointerenter', pointerenterCallback );

		};

	}

	getUpDirection( point, target ) {

		target.copy( this.up );

	}

	detach() {

		if ( this._detachCallback ) {

			this._detachCallback();
			this._detachCallback = null;
			this.pointerTracker.reset();

		}

	}

	resetState() {

		if ( this.state !== NONE || this.pinchState !== NONE ) {

			this.dispatchEvent( _endEvent );

		}

		this.state = NONE;
		this.pinchState = NONE;
		this.dragPointSet = false;
		this.rotationPointSet = false;
		this.scene.remove( this.pivotMesh );
		this.pivotMesh.visible = true;
		this.actionHeightOffset = 0;

	}

	setState( state = this.state, pinchState = this.pinchState, fireEvent = true ) {

		if ( this.state === state && this.pinchState === pinchState ) {

			return;

		}

		if ( this.state === NONE && this.pinchState === NONE && fireEvent ) {

			this.dispatchEvent( _startEvent );

		}

		this.state = state;
		this.pinchState = pinchState;

	}

	update() {

		if ( ! this.enabled ) {

			return;

		}

		const {
			camera,
			cameraRadius,
			dragPoint,
			up,
			state,
			pinchState,
			adjustHeight,
		} = this;

		// update the actions
		if ( this.needsUpdate ) {

			const action = state || pinchState;
			const zoomDelta = this.zoomDelta;
			if ( action === DRAG ) {

				this._updatePosition();

			}

			if ( action === ROTATE ) {

				this._updateRotation();

			}

			if ( action === ZOOM || zoomDelta !== 0 ) {

				this._updateZoom();

			}

			if ( action !== NONE || zoomDelta !== 0 ) {

				this.dispatchEvent( _changeEvent );

			}

			this.needsUpdate = false;

		}

		// reuse the "hit" information since it can be slow to perform multiple hits
		const hit = adjustHeight && this._getPointBelowCamera() || null;
		this.getUpDirection( camera.position, _localUp );
		if ( ! this._upInitialized ) {

			this._upInitialized = true;
			this.up.copy( _localUp );

		} else {

			this._setFrame( _localUp, hit && hit.point || null );

		}

		// when dragging the camera and drag point may be moved
		// to accommodate terrain so we try to move it back down
		// to the original point.
		if ( ( this.state === DRAG || this.state === ROTATE ) && this.actionHeightOffset !== 0 ) {

			const { actionHeightOffset } = this;
			camera.position.addScaledVector( up, - actionHeightOffset );
			dragPoint.addScaledVector( up, - actionHeightOffset );

			// adjust the height
			if ( hit ) {

				hit.distance -= actionHeightOffset;

			}

		}

		this.actionHeightOffset = 0;

		if ( hit ) {

			const dist = hit.distance;
			if ( dist < cameraRadius ) {

				const delta = cameraRadius - dist;
				camera.position.addScaledVector( up, delta );
				dragPoint.addScaledVector( up, delta );
				this.actionHeightOffset = delta;

			}

		}

		this.pointerTracker.updateFrame();

	}

	dispose() {

		this.detach();

	}

	// private
	_updateZoom() {

		const {
			zoomPoint,
			zoomDirection,
			camera,
			minZoomDistance,
			maxZoomDistance,
			raycaster,
			pointerTracker,
			domElement,
		} = this;

		let scale = this.zoomDelta;
		this.zoomDelta = 0;

		// get the latest hover / touch point
		if ( ! pointerTracker.getLatestPoint( _pointer ) ) {

			return;

		}

		// initialize the zoom direction
		mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );
		raycaster.setFromCamera( _pointer, camera );
		zoomDirection.copy( raycaster.ray.direction ).normalize();
		this.zoomDirectionSet = true;

		// track the zoom direction we're going to use
		const finalZoomDirection = _vec.copy( zoomDirection );

		// always update the zoom target point in case the tiles are changing
		let dist = Infinity;
		if ( this._updateZoomPoint() ) {

			dist = zoomPoint.distanceTo( camera.position );

			// scale the distance based on how far there is to move
			if ( scale < 0 ) {

				const remainingDistance = Math.min( 0, dist - maxZoomDistance );
				scale = scale * dist * 0.01;
				scale = Math.max( scale, remainingDistance );

			} else {

				const remainingDistance = Math.max( 0, dist - minZoomDistance );
				scale = scale * ( dist - minZoomDistance ) * 0.01;
				scale = Math.min( scale, remainingDistance );

			}

			camera.position.addScaledVector( zoomDirection, scale );
			camera.updateMatrixWorld();

		} else {

			// if we're zooming into nothing then use the distance from the ground to scale movement
			const hit = this._getPointBelowCamera();
			if ( hit ) {

				dist = hit.distance;
				finalZoomDirection.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
				camera.position.addScaledVector( finalZoomDirection, scale * dist * 0.01 );
				camera.updateMatrixWorld();

			}

		}

	}

	// update the point being zoomed in to based on the zoom direction
	_updateZoomPoint() {

		const {
			camera,
			zoomDirectionSet,
			zoomDirection,
			raycaster,
			scene,
			zoomPoint,
		} = this;

		if ( ! zoomDirectionSet ) {

			return false;

		}

		raycaster.ray.origin.copy( camera.position );
		raycaster.ray.direction.copy( zoomDirection );

		const hit = raycaster.intersectObject( scene )[ 0 ] || null;
		if ( hit ) {

			zoomPoint.copy( hit.point );
			this.zoomPointSet = true;
			return true;

		}

		return false;

	}

	// returns the point below the camera
	_getPointBelowCamera() {

		const { camera, raycaster, scene, up } = this;
		raycaster.ray.direction.copy( up ).multiplyScalar( - 1 );
		raycaster.ray.origin.copy( camera.position ).addScaledVector( up, 1e5 );

		const hit = raycaster.intersectObject( scene )[ 0 ] || null;
		if ( hit ) {

			hit.distance -= 1e5;

		}

		return hit;

	}

	// update the drag action
	_updatePosition() {

		const {
			raycaster,
			camera,
			dragPoint,
			up,
			pointerTracker,
			domElement,
		} = this;

		// get the pointer and plane
		pointerTracker.getCenterPoint( _pointer );
		mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );

		_plane.setFromNormalAndCoplanarPoint( up, dragPoint );
		raycaster.setFromCamera( _pointer, camera );

		// prevent the drag distance from getting too severe by limiting the drag point
		// to a reasonable angle with the drag plane
		if ( - raycaster.ray.direction.dot( up ) < DRAG_PLANE_THRESHOLD ) {

			// rotate the pointer direction down to the correct angle for horizontal dragging
			const angle = Math.acos( DRAG_PLANE_THRESHOLD );

			_rotationAxis
				.crossVectors( raycaster.ray.direction, up )
				.normalize();

			raycaster.ray.direction
				.copy( up )
				.applyAxisAngle( _rotationAxis, angle )
				.multiplyScalar( - 1 );

		}

		// TODO: dragging causes the camera to rise because we're getting "pushed" up by lower resolution tiles and
		// don't lower back down. We should maintain a target height above tiles where possible
		// prevent the drag from inverting

		// if we drag to a point that's near the edge of the earth then we want to prevent it
		// from wrapping around and causing unexpected rotations
		this.getUpDirection( dragPoint, _localUp );
		if ( - raycaster.ray.direction.dot( _localUp ) < DRAG_UP_THRESHOLD ) {

			const angle = Math.acos( DRAG_UP_THRESHOLD );

			_rotationAxis
				.crossVectors( raycaster.ray.direction, _localUp )
				.normalize();

			raycaster.ray.direction
				.copy( _localUp )
				.applyAxisAngle( _rotationAxis, angle )
				.multiplyScalar( - 1 );

		}

		// find the point on the plane that we should drag to
		if ( raycaster.ray.intersectPlane( _plane, _vec ) ) {

			_delta.subVectors( dragPoint, _vec );
			this.camera.position.add( _delta );
			this.camera.updateMatrixWorld();

		}

	}

	_updateRotation() {

		const {
			camera,
			rotationPoint,
			minAltitude,
			maxAltitude,
			up,
			pointerTracker,
			rotationSpeed,
		} = this;

		// get the rotation motion and scale the rotation based on pixel ratio for consistency
		pointerTracker.getCenterPoint( _pointer );
		pointerTracker.getPreviousCenterPoint( _prevPointer );
		_deltaPointer.subVectors( _pointer, _prevPointer ).multiplyScalar( 0.01 / devicePixelRatio );

		const azimuth = - _deltaPointer.x * rotationSpeed;
		let altitude = _deltaPointer.y * rotationSpeed;

		// calculate current angles and clamp
		_forward
			.set( 0, 0, - 1 )
			.transformDirection( camera.matrixWorld )
			.multiplyScalar( - 1 );

		this.getUpDirection( rotationPoint, _localUp );

		// get the signed angle relative to the top down view
		_vec.crossVectors( up, _forward ).normalize();
		_right.set( 1, 0, 0 ).transformDirection( camera.matrixWorld ).normalize();
		const sign = Math.sign( _vec.dot( _right ) );
		const angle = sign * up.angleTo( _forward );

		// clamp the rotation to be within the provided limits
		// clamp to 0 here, as well, so we don't "pop" to the the value range
		if ( altitude > 0 ) {

			altitude = Math.min( angle - minAltitude - 1e-2, altitude );
			altitude = Math.max( 0, altitude );

		} else {

			altitude = Math.max( angle - maxAltitude, altitude );
			altitude = Math.min( 0, altitude );

		}

		// rotate around the up axis
		_quaternion.setFromAxisAngle( _localUp, azimuth );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		// get a rotation axis for altitude and rotate
		_rotationAxis.set( - 1, 0, 0 ).transformDirection( camera.matrixWorld );

		_quaternion.setFromAxisAngle( _rotationAxis, altitude );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		// update the transform members
		camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

	}

	// sets the "up" axis for the current surface of the tile set
	_setFrame( newUp, pivot ) {

		const { up, camera, state, pinchState, zoomPoint, zoomDirection } = this;
		camera.updateMatrixWorld();

		// get the amount needed to rotate
		_quaternion.setFromUnitVectors( up, newUp );

		const action = state || pinchState;
		if ( this.zoomDirectionSet && ( this.zoomPointSet || this._updateZoomPoint() ) ) {

			if ( this.reorientOnZoom ) {

				// rotates the camera position around the point being zoomed in to
				makeRotateAroundPoint( zoomPoint, _quaternion, _rotMatrix );
				camera.matrixWorld.premultiply( _rotMatrix );
				camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

				zoomDirection.subVectors( zoomPoint, camera.position ).normalize();

			}

		} else if ( action === NONE || action === DRAG && this.reorientOnDrag ) {

			// NOTE: We used to derive the pivot point here by getting the point below the camera
			// but decided to pass it in via "update" to avoid multiple ray casts

			if ( pivot ) {

				// perform a simple realignment by rotating the camera around the pivot
				makeRotateAroundPoint( pivot, _quaternion, _rotMatrix );
				camera.matrixWorld.premultiply( _rotMatrix );
				camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

			}

		}

		up.copy( newUp );
		camera.updateMatrixWorld();

	}

}
