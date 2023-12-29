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

const ACTION_THRESHOLD = 2 * window.devicePixelRatio;

const _matrix = new Matrix4();
const _rotMatrix = new Matrix4();
const _delta = new Vector3();
const _vec = new Vector3();
const _rotationAxis = new Vector3();
const _quaternion = new Quaternion();
const _up = new Vector3( 0, 1, 0 );
const _plane = new Plane();

// TODO
// - Touch controls
// - Add support for angled rotation plane (based on where the pivot point is)
// - Test with globe (adjusting up vector)
// ---
// - Consider using sphere intersect for positioning
// - Toggles for zoom to cursor, zoom forward, orbit around center, etc?
// - provide fallback plane for cases when you're off the map

// helper function for constructing a matrix for rotating around a point
function makeRotateAroundPoint( point, quat, target ) {

	target.makeTranslation( - point.x, - point.y, - point.z );

	_matrix.makeRotationFromQuaternion( quat );
	target.premultiply( _matrix );

	_matrix.makeTranslation( point.x, point.y, point.z );
	target.premultiply( _matrix );

	return target;

}

// get the three.js pointer coords from an event
function mouseToCoords( clientX, clientY, element, target ) {

	target.x = ( clientX / element.clientWidth ) * 2 - 1;
	target.y = - ( clientY / element.clientHeight ) * 2 + 1;

}

export class GlobeControls {

	constructor( scene, camera, domElement ) {

		this.domElement = null;
		this.camera = null;
		this.scene = null;

		// settings
		this.state = NONE;
		this.cameraRadius = 1;
		this.rotationSpeed = 5;
		this.minAltitude = 0;
		this.maxAltitude = Math.PI / 2;
		this.minDistance = 2;
		this.maxDistance = Infinity;

		this.pivotMesh = new PivotPointMesh();
		this.pivotMesh.raycast = () => {};
		this.pivotMesh.scale.setScalar( 0.25 );

		// internal state
		this.dragPointSet = false;
		this.dragPoint = new Vector3();
		this.startDragPoint = new Vector3();

		this.rotationPointSet = false;
		this.rotationPoint = new Vector3();
		this.rotationClickDirection = new Vector3();

		this.zoomDirectionSet = false;
		this.zoomPointSet = false;
		this.zoomDirection = new Vector3();
		this.zoomPoint = new Vector3();

		this.raycaster = new Raycaster();
		this.raycaster.firstHitOnly = true;

		this._detachCallback = null;

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

		const _pointer = new Vector2();
		const _newPointer = new Vector2();
		const _deltaPointer = new Vector2();
		const _centerPoint = new Vector2();
		const _originalCenterPoint = new Vector2();
		let _pinchAction = NONE;
		let _pointerMoveQueued = false;

		const _pointerTracker = new PointerTracker();
		let _pointerDist = 0;
		let _originalPointerDist = 0;
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

			const { camera, raycaster, domElement, scene } = this;

			// get the screen coordinates
			mouseToCoords( e.clientX, e.clientY, domElement, _pointer );

			if ( e.pointerType === 'touch' ) {

				if ( _pointerTracker.getPointerCount() === 0 ) {

					domElement.setPointerCapture( e.pointerId );

				}

				// init fields
				_pointerTracker.addPointer( e );
				_pointerDist = 0;
				_originalPointerDist = 0;

				// if we find a second pointer init other values
				if ( _pointerTracker.getPointerCount() === 2 ) {

					_pointerTracker.getCenterPoint( _originalCenterPoint );
					_centerPoint.copy( _originalCenterPoint );

					_pointerDist = _pointerTracker.getPointerDistance();
					_originalPointerDist = _pointerTracker.getPointerDistance();

					// the "pointer" for zooming and rotating should be based on the center point
					mouseToCoords( _centerPoint.x, _centerPoint.y, domElement, _pointer );
					_newPointer.copy( _pointer );

				} else if ( _pointerTracker.getPointerCount() > 2 ) {

					resetState();
					return;

				}

			}

			// find the hit point
			raycaster.setFromCamera( _pointer, camera );
			const hit = raycaster.intersectObject( scene )[ 0 ] || null;
			if ( hit ) {

				// if two fingers, right click, or shift click are being used then we trigger
				// a rotation action to begin
				if ( _pointerTracker.getPointerCount() === 2 || e.buttons & 2 || e.buttons & 1 && shiftClicked ) {

					_matrix.copy( camera.matrixWorld ).invert();

					this.state = ROTATE;
					this.rotationPoint.copy( hit.point );
					this.rotationClickDirection.copy( raycaster.ray.direction ).transformDirection( _matrix );
					this.rotationPointSet = true;

					this.pivotMesh.position.copy( hit.point );
					this.scene.add( this.pivotMesh );

				} else if ( e.buttons & 1 ) {

					this.state = DRAG;
					this.dragPoint.copy( hit.point );
					this.startDragPoint.copy( hit.point );
					this.dragPointSet = true;

					this.pivotMesh.position.copy( hit.point );
					this.scene.add( this.pivotMesh );

				}

			}

		};

		const pointermoveCallback = e => {

			this.zoomDirectionSet = false;
			this.zoomPointSet = false;

			if ( e.pointerType === 'touch' ) {

				if ( ! _pointerTracker.updatePointer( e ) ) {

					return;

				}

				if ( _pointerTracker.getPointerCount() === 1 ) {

					// if there's only one pointer active then handle the drag event
					mouseToCoords( e.clientX, e.clientY, domElement, _pointer );

					if ( this.state === DRAG ) {

						performDrag();

					}

				} else if ( _pointerTracker.getPointerCount() === 2 ) {

					if ( ! _pointerMoveQueued ) {

						_pointerMoveQueued = true;
						queueMicrotask( () => {

							_pointerMoveQueued = false;

							// adjust the pointer position to be the center point
							_pointerTracker.getCenterPoint( _centerPoint );

							// detect zoom transition
							const previousDist = _pointerDist;
							_pointerDist = _pointerTracker.getPointerDistance();
							if ( _pinchAction === NONE ) {

								if ( _pointerDist - _originalPointerDist > ACTION_THRESHOLD ) {

									resetState();
									_pinchAction = ZOOM;
									this.zoomDirectionSet = false;

								} else if ( _centerPoint.distanceTo( _originalCenterPoint ) > ACTION_THRESHOLD ) {

									_pinchAction = ROTATE;


								}

							}

							if ( _pinchAction === ZOOM ) {

								// perform zoom
								performZoom( _pointerDist - previousDist );

							} else if ( _pinchAction === ROTATE ) {

								// perform rotation
								const { rotationSpeed } = this;
								mouseToCoords( _centerPoint.x, _centerPoint.y, domElement, _newPointer );
								_deltaPointer.subVectors( _newPointer, _pointer );
								_pointer.copy( _newPointer );
								this.updateRotation( - _deltaPointer.x * rotationSpeed, - _deltaPointer.y * rotationSpeed );

							} else {

								// no action
								_pointer.copy( _newPointer );

							}

						} );

					}

				}

			} else if ( e.pointerType === 'mouse' ) {

				mouseToCoords( e.clientX, e.clientY, domElement, _newPointer );
				_deltaPointer.subVectors( _newPointer, _pointer );
				_pointer.copy( _newPointer );

				if ( this.state === DRAG ) {

					performDrag();

				} else if ( this.state === ROTATE ) {

					const { rotationSpeed } = this;
					this.updateRotation( - _deltaPointer.x * rotationSpeed, - _deltaPointer.y * rotationSpeed );

				}

			}

		};

		const pointerupCallback = e => {

			resetState();

			if ( e.pointerType === 'touch' ) {

				_pointerTracker.deletePointer( e );
				_pinchAction = NONE;

				if ( _pointerTracker.getPointerCount() === 0 ) {

					domElement.releasePointerCapture( e.pointerId );

				}

			}

		};

		const wheelCallback = e => {

			performZoom( - e.deltaY );

		};

		const pointerenterCallback = e => {

			mouseToCoords( e.clientX, e.clientY, domElement, _pointer );
			shiftClicked = false;

			if ( e.buttons === 0 ) {

				resetState();

			}

		};

		const resetState = () => {

			this.state = NONE;
			this.dragPointSet = false;
			this.rotationPointSet = false;
			this.scene.remove( this.pivotMesh );

		};

		const performZoom = delta => {

			if ( ! this.zoomDirectionSet ) {

				const { raycaster, scene } = this;
				raycaster.setFromCamera( _pointer, this.camera );

				const hit = raycaster.intersectObject( scene )[ 0 ] || null;
				if ( hit ) {

					this.zoomPoint.copy( hit.point );
					this.zoomPointSet = true;

				}

				this.zoomDirection.copy( this.raycaster.ray.direction ).normalize();
				this.zoomDirectionSet = true;

			}

			this.updateZoom( delta );

		};

		const performDrag = () => {

			const { raycaster, camera, dragPoint } = this;
			_plane.setFromNormalAndCoplanarPoint( _up, dragPoint );
			raycaster.setFromCamera( _pointer, camera );

			if ( raycaster.ray.intersectPlane( _plane, _vec ) ) {

				_delta.subVectors( dragPoint, _vec );
				this.updatePosition( _delta );

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

		}

	}

	updateZoom( scale ) {

		const {
			zoomPointSet,
			zoomPoint,
			zoomDirection,
			camera,
			raycaster,
			scene,
			minDistance,
			maxDistance,
		} = this;

		const fallback = scale < 0 ? - 1 : 1;
		let dist = Infinity;
		if ( zoomPointSet ) {

			dist = zoomPoint.distanceTo( camera.position );

		} else {

			raycaster.ray.origin.copy( camera.position );
			raycaster.ray.direction.copy( zoomDirection );

			const hit = raycaster.intersectObject( scene )[ 0 ] || null;
			if ( hit ) {

				dist = hit.distance;

			}

		}

		zoomDirection.normalize();
		scale = Math.min( scale * ( dist - minDistance ) * 0.01, Math.max( 0, dist - minDistance ) );
		if ( scale === Infinity || scale === - Infinity || Number.isNaN( scale ) ) {

			scale = fallback;

		}

		if ( scale < 0 ) {

			const remainingDistance = Math.min( 0, dist - maxDistance );
			scale = Math.max( scale, remainingDistance );

		}

		this.camera.position.addScaledVector( zoomDirection, scale );
		this.camera.updateMatrixWorld();

	}

	updatePosition( delta ) {

		// TODO: when adjusting the frame we have to reproject the grab point
		// so as the use drags it winds up in the same spot.
		// Will this work? Or be good enough?
		this.camera.position.add( delta );

	}

	updateRotation( azimuth, altitude ) {

		const { camera, rotationPoint, minAltitude, maxAltitude } = this;

		// currently uses the camera forward for this work but it may be best to use a combination of camera
		// forward and direction to pivot? Or just dir to pivot?
		_delta.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld ).multiplyScalar( - 1 );

		const angle = _up.angleTo( _delta );
		if ( altitude > 0 ) {

			altitude = Math.min( angle - minAltitude - 1e-2, altitude );

		} else {

			altitude = Math.max( angle - maxAltitude, altitude );

		}

		// zoom in frame around pivot point
		_quaternion.setFromAxisAngle( _up, azimuth );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		_rotationAxis.set( - 1, 0, 0 ).transformDirection( camera.matrixWorld );

		_quaternion.setFromAxisAngle( _rotationAxis, altitude );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );
		camera.updateMatrixWorld();

	}

	update() {

		const {
			raycaster,
			camera,
			scene,
			cameraRadius,
			dragPoint,
			startDragPoint,
		} = this;

		// when dragging the camera and drag point may be moved
		// to accommodate terrain so we try to move it back down
		// to the original point.
		if ( this.state === DRAG ) {

			_delta.subVectors( startDragPoint, dragPoint );
			camera.position.add( _delta );
			dragPoint.copy( startDragPoint );

		}

		// cast down from the camera
		raycaster.ray.direction.copy( _up ).multiplyScalar( - 1 );
		raycaster.ray.origin.copy( camera.position ).addScaledVector( raycaster.ray.direction, - 100 );

		const hit = raycaster.intersectObject( scene )[ 0 ];
		if ( hit ) {

			const dist = hit.distance - 100;
			if ( dist < cameraRadius ) {

				const delta = cameraRadius - dist;
				camera.position.copy( hit.point ).addScaledVector( raycaster.ray.direction, - cameraRadius );
				dragPoint.addScaledVector( _up, delta );

			}

		}

	}

	dispose() {

		this.detach();

	}

}

