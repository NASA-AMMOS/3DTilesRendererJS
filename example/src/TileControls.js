import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	Raycaster,
	Plane,
} from 'three';
import { PivotPointMesh } from './PivotPointMesh.js';
import { PointerTracker } from './PointerTracker.js';

const NONE = 0;
const DRAG = 1;
const ROTATE = 2;
const ZOOM = 3;

const DRAG_PLANE_THRESHOLD = 0.05;
const DRAG_UP_THRESHOLD = 0.025;

const _matrix = new Matrix4();
const _rotMatrix = new Matrix4();
const _delta = new Vector3();
const _vec = new Vector3();
const _forward = new Vector3();
const _rotationAxis = new Vector3();
const _quaternion = new Quaternion();
const _plane = new Plane();
const _localUp = new Vector3();

const _pointer = new Vector2();
const _prevPointer = new Vector2();
const _deltaPointer = new Vector2();
const _centerPoint = new Vector2();
const _originalCenterPoint = new Vector2();

// helper function for constructing a matrix for rotating around a point
export function makeRotateAroundPoint( point, quat, target ) {

	target.makeTranslation( - point.x, - point.y, - point.z );

	_matrix.makeRotationFromQuaternion( quat );
	target.premultiply( _matrix );

	_matrix.makeTranslation( point.x, point.y, point.z );
	target.premultiply( _matrix );

	return target;

}

// get the three.js pointer coords from an event
function mouseToCoords( clientX, clientY, element, target ) {

	target.x = ( ( clientX - element.offsetLeft ) / element.clientWidth ) * 2 - 1;
	target.y = - ( ( clientY - element.offsetTop ) / element.clientHeight ) * 2 + 1;

}

export class TileControls {

	constructor( scene, camera, domElement ) {

		this.domElement = null;
		this.camera = null;
		this.scene = null;

		// settings
		this.state = NONE;
		this.cameraRadius = 1;
		this.rotationSpeed = 5;
		this.minAltitude = 0;
		this.maxAltitude = 0.45 * Math.PI;
		this.minDistance = 2;
		this.maxDistance = Infinity;
		this.getUpDirection = null;
		this.reorientOnDrag = true;
		this.reorientOnZoom = false;

		// internal state
		this.pointerTracker = new PointerTracker();

		this.dragPointSet = false;
		this.dragPoint = new Vector3();
		this.startDragPoint = new Vector3();

		this.rotationPointSet = false;
		this.rotationPoint = new Vector3();

		this.zoomDirectionSet = false;
		this.zoomPointSet = false;
		this.zoomDirection = new Vector3();
		this.zoomPoint = new Vector3();

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

			throw new Error( 'GlobeControls: Controls already attached to element' );

		}

		this.domElement = domElement;
		domElement.style.touchAction = 'none';

		let _pinchAction = NONE;

		const pointerTracker = this.pointerTracker;
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

			const {
				camera,
				raycaster,
				domElement,
				scene,
				up,
				pivotMesh,
				pointerTracker,
			} = this;

			// init fields
			pointerTracker.addPointer( e );

			if ( e.pointerType === 'touch' ) {

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

					_matrix.copy( camera.matrixWorld ).invert();

					this.state = ROTATE;
					this.rotationPoint.copy( hit.point );
					this.rotationPointSet = true;

					this.pivotMesh.position.copy( hit.point );
					this.pivotMesh.updateMatrixWorld();
					this.scene.add( this.pivotMesh );

				} else if ( pointerTracker.isLeftClicked() ) {

					// if the clicked point is coming from below the plane then don't perform the drag
					if ( raycaster.ray.direction.dot( up ) < 0 ) {

						this.state = DRAG;
						this.dragPoint.copy( hit.point );
						this.startDragPoint.copy( hit.point );
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

			this.zoomDirectionSet = false;
			this.zoomPointSet = false;

			const { pointerTracker } = this;

			pointerTracker.setHoverEvent( e );
			if ( ! pointerTracker.updatePointer( e ) ) {

				return;

			}

			if ( pointerTracker.getPointerType() === 'touch' ) {

				if ( pointerTracker.getPointerCount() === 1 ) {

					if ( this.state === DRAG ) {

						this._updatePosition();

					}

				} else if ( pointerTracker.getPointerCount() === 2 ) {

					// We queue this event to ensure that all pointers have been updated
					if ( ! _pointerMoveQueued ) {

						_pointerMoveQueued = true;
						queueMicrotask( () => {

							_pointerMoveQueued = false;

							// adjust the pointer position to be the center point
							pointerTracker.getCenterPoint( _centerPoint );

							// detect zoom transition
							const previousDist = pointerTracker.getPreviousPointerDistance();
							const pointerDist = pointerTracker.getPointerDistance();
							const separateDelta = pointerDist - previousDist;
							if ( _pinchAction === NONE ) {

								// check which direction was moved in first
								pointerTracker.getCenterPoint( _centerPoint );
								pointerTracker.getPreviousCenterPoint( _originalCenterPoint );

								const parallelDelta = _centerPoint.distanceTo( _originalCenterPoint );
								if ( separateDelta > 0 && parallelDelta > 0 ) {

									if ( separateDelta > parallelDelta ) {

										this.resetState();
										_pinchAction = ZOOM;
										this.zoomDirectionSet = false;

									} else {

										_pinchAction = ROTATE;


									}

								}

							}

							if ( _pinchAction === ZOOM ) {

								// perform zoom
								this._updateZoom( separateDelta );

							} else if ( _pinchAction === ROTATE ) {

								this._updateRotation();
								this.pivotMesh.visible = true;

							}

						} );

					}

				}

			} else if ( pointerTracker.getPointerType() === 'mouse' ) {

				if ( this.state === DRAG ) {

					this._updatePosition();

				} else if ( this.state === ROTATE ) {

					const { rotationSpeed } = this;
					this._updateRotation( - _deltaPointer.x * rotationSpeed, - _deltaPointer.y * rotationSpeed );

				}

			}

		};

		const pointerupCallback = e => {

			this.resetState();

			pointerTracker.deletePointer( e );
			_pinchAction = NONE;

			if ( pointerTracker.getPointerType() === 'touch' && pointerTracker.getPointerCount() === 0 ) {

				domElement.releasePointerCapture( e.pointerId );

			}

		};

		const wheelCallback = e => {

			this._updateZoom( - e.deltaY );

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

	detach() {

		if ( this._detachCallback ) {

			this._detachCallback();
			this._detachCallback = null;
			this.pointerTracker = new PointerTracker();

		}

	}

	resetState() {

		this.state = NONE;
		this.dragPointSet = false;
		this.rotationPointSet = false;
		this.scene.remove( this.pivotMesh );
		this.pivotMesh.visible = true;

	}

	update() {

		const {
			raycaster,
			camera,
			cameraRadius,
			dragPoint,
			startDragPoint,
			up,
		} = this;

		if ( this.getUpDirection ) {

			this.getUpDirection( camera.position, _localUp );
			if ( ! this._upInitialized ) {

				// TODO: do we need to do more here? Possibly add a helper for initializing
				// the camera orientation?
				this._upInitialized = true;
				this.up.copy( _localUp );

			} else {

				this.setFrame( _localUp );

			}

		}

		// when dragging the camera and drag point may be moved
		// to accommodate terrain so we try to move it back down
		// to the original point.
		if ( this.state === DRAG ) {

			_delta.subVectors( startDragPoint, dragPoint );
			camera.position.add( _delta );
			dragPoint.copy( startDragPoint );

		}

		// cast down from the camera
		const hit = this._getPointBelowCamera();
		if ( hit ) {

			const dist = hit.distance - 1e5;
			if ( dist < cameraRadius ) {

				const delta = cameraRadius - dist;
				camera.position.copy( hit.point ).addScaledVector( raycaster.ray.direction, - cameraRadius );
				dragPoint.addScaledVector( up, delta );

			}

		}

	}

	dispose() {

		this.detach();

	}

	// private
	_updateZoom( scale ) {

		const {
			zoomPoint,
			zoomDirection,
			camera,
			minDistance,
			maxDistance,
			raycaster,
			pointerTracker,
			domElement,
		} = this;

		if ( ! pointerTracker.getLatestPoint( _pointer ) ) {

			return;

		}

		mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );
		raycaster.setFromCamera( _pointer, camera );
		zoomDirection.copy( raycaster.ray.direction ).normalize();
		this.zoomDirectionSet = true;

		const finalZoomDirection = _vec.copy( zoomDirection );

		// always update the zoom target point in case the tiles are changing
		let dist = Infinity;
		if ( this._updateZoomPoint() ) {

			dist = zoomPoint.distanceTo( camera.position );

		} else {

			// if we're zooming into nothing then use the distance from the ground to scale movement
			const hit = this._getPointBelowCamera();
			if ( hit ) {

				dist = hit.distance;

			} else {

				return;

			}

			finalZoomDirection.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );

		}

		// scale the distance based on how far there is to move
		if ( scale < 0 ) {

			const remainingDistance = Math.min( 0, dist - maxDistance );
			scale = scale * ( dist - 0 ) * 0.01;
			scale = Math.max( scale, remainingDistance );

		} else {

			const remainingDistance = Math.max( 0, dist - minDistance );
			scale = scale * ( dist - minDistance ) * 0.01;
			scale = Math.min( scale, remainingDistance );

		}

		camera.position.addScaledVector( finalZoomDirection, scale );
		camera.updateMatrixWorld();

	}

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

	_getPointBelowCamera() {

		const { camera, raycaster, scene, up } = this;
		raycaster.ray.direction.copy( up ).multiplyScalar( - 1 );
		raycaster.ray.origin.copy( camera.position ).addScaledVector( raycaster.ray.direction, - 1e5 );

		return raycaster.intersectObject( scene )[ 0 ] || null;

	}

	_updatePosition() {

		const {
			raycaster,
			camera,
			dragPoint,
			up,
			pointerTracker,
			domElement,
		} = this;

		pointerTracker.getCenterPoint( _pointer );
		mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );

		_plane.setFromNormalAndCoplanarPoint( up, dragPoint );
		raycaster.setFromCamera( _pointer, camera );

		// prevent the drag distance from getting too severe
		if ( - raycaster.ray.direction.dot( up ) < DRAG_PLANE_THRESHOLD ) {

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
		if ( this.getUpDirection ) {

			this.getUpDirection( dragPoint, _localUp );
			if ( - _localUp.dot( raycaster.ray.direction ) < DRAG_UP_THRESHOLD ) {

				const angle = Math.acos( DRAG_UP_THRESHOLD );

				_rotationAxis
					.crossVectors( raycaster.ray.direction, _localUp )
					.normalize();

				raycaster.ray.direction
					.copy( _localUp )
					.applyAxisAngle( _rotationAxis, angle )
					.multiplyScalar( - 1 );

			}

		}

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
			domElement,
			pointerTracker,
			rotationSpeed,
		} = this;

		// get the rotation motion
		pointerTracker.getCenterPoint( _pointer );
		mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );

		pointerTracker.getPreviousCenterPoint( _prevPointer );
		mouseToCoords( _prevPointer.x, _prevPointer.y, domElement, _prevPointer );

		_deltaPointer.subVectors( _pointer, _prevPointer );

		const azimuth = - _deltaPointer.x * rotationSpeed;
		let altitude = - _deltaPointer.y * rotationSpeed;

		// currently uses the camera forward for this work but it may be best to use a combination of camera
		// forward and direction to pivot? Or just dir to pivot?
		_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld ).multiplyScalar( - 1 );

		if ( this.getUpDirection ) {

			this.getUpDirection( rotationPoint, _localUp );

		} else {

			_localUp.copy( up );

		}

		const angle = _localUp.angleTo( _forward );
		if ( altitude > 0 ) {

			altitude = Math.min( angle - minAltitude - 1e-2, altitude );

		} else {

			altitude = Math.max( angle - maxAltitude, altitude );

		}

		// zoom in frame around pivot point
		_quaternion.setFromAxisAngle( _localUp, azimuth );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		_rotationAxis.set( - 1, 0, 0 ).transformDirection( camera.matrixWorld );

		_quaternion.setFromAxisAngle( _rotationAxis, altitude );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );
		camera.updateMatrixWorld();

	}

	setFrame( newUp ) {

		const pivot = new Vector3();
		let dist = 0;

		// cast down from the camera to get the pivot to rotate around
		const { up, camera, state, zoomPoint, zoomDirection } = this;
		camera.updateMatrixWorld();

		const hit = this._getPointBelowCamera();
		if ( hit ) {

			_vec.setFromMatrixPosition( camera.matrixWorld );

			pivot.copy( hit.point );
			dist = pivot.distanceTo( _vec );

		} else {

			return;

		}

		_quaternion.setFromUnitVectors( up, newUp );

		if ( this.zoomDirectionSet ) {

			// TODO: just zoom backwards if we're at a steep angle
			if ( this.zoomPointSet || this._updateZoomPoint() ) {

				if ( this.reorientOnZoom ) {

					makeRotateAroundPoint( zoomPoint, _quaternion, _rotMatrix );
					camera.matrixWorld.premultiply( _rotMatrix );
					camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

					zoomDirection.subVectors( zoomPoint, camera.position ).normalize();

				}

			} else {

				camera.position.copy( pivot ).addScaledVector( newUp, dist );
				camera.quaternion.premultiply( _quaternion );
				camera.updateMatrixWorld();

			}

		} else if ( state !== ROTATE && this.reorientOnDrag ) {

			// TODO: fix this for dragging from afar
			camera.position.copy( pivot ).addScaledVector( newUp, dist );
			camera.quaternion.premultiply( _quaternion );
			camera.updateMatrixWorld();

		}

		up.copy( newUp );

	}

}
