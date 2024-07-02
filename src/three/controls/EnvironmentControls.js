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
const _mouseBefore = new Vector3();
const _mouseAfter = new Vector3();

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

		return this._enabled;

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
		this.cameraRadius = 5;
		this.rotationSpeed = 1;
		this.minAltitude = 0;
		this.maxAltitude = 0.45 * Math.PI;
		this.minDistance = 10;
		this.maxDistance = Infinity;
		this.minZoom = 0;
		this.maxZoom = Infinity;
		this.zoomSpeed = 1;

		this.reorientOnDrag = true;
		this.reorientOnZoom = false;
		this.adjustHeight = true;

		// internal state
		this.pointerTracker = new PointerTracker();
		this.needsUpdate = false;
		this.actionHeightOffset = 0;

		this.pivotPoint = new Vector3();

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

		this.fallbackPlane = new Plane( new Vector3( 0, 1, 0 ), 0 );
		this.useFallbackPlane = true;

		this._detachCallback = null;
		this._upInitialized = false;

		// init
		if ( domElement ) this.attach( domElement );
		if ( camera ) this.setCamera( camera );
		if ( scene ) this.setScene( scene );

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
		this.pointerTracker.domElement = domElement;
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
				up,
				pivotMesh,
				pointerTracker,
			} = this;

			// init the pointer
			pointerTracker.addPointer( e );
			this.needsUpdate = true;

			// handle cases where we need to capture the pointer or
			// reset state when we have too many pointers
			if ( pointerTracker.isPointerTouch() ) {

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
			raycaster.setFromCamera( _pointer, camera );

			// prevent the drag distance from getting too severe by limiting the drag point
			// to a reasonable angle and reasonable distance with the drag plane
			const dot = Math.abs( raycaster.ray.direction.dot( up ) );
			if ( dot < DRAG_PLANE_THRESHOLD || dot < DRAG_UP_THRESHOLD ) {

				return;

			}

			// find the hit point
			const hit = this._raycast( raycaster );
			if ( hit ) {

				// if two fingers, right click, or shift click are being used then we trigger
				// a rotation action to begin
				if (
					pointerTracker.getPointerCount() === 2 ||
					pointerTracker.isRightClicked() ||
					pointerTracker.isLeftClicked() && shiftClicked
				) {

					this.setState( pointerTracker.isPointerTouch() ? WAITING : ROTATE );

					this.pivotPoint.copy( hit.point );
					this.pivotMesh.position.copy( hit.point );
					this.pivotMesh.updateMatrixWorld();
					this.scene.add( this.pivotMesh );

				} else if ( pointerTracker.isLeftClicked() ) {

					// if the clicked point is coming from below the plane then don't perform the drag
					this.setState( DRAG );
					this.pivotPoint.copy( hit.point );

					this.pivotMesh.position.copy( hit.point );
					this.pivotMesh.updateMatrixWorld();
					this.scene.add( this.pivotMesh );

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

			if ( pointerTracker.isPointerTouch() && pointerTracker.getPointerCount() === 2 ) {

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
						if ( this.state === NONE || this.state === WAITING ) {

							// check which direction was moved in first - if the pointers are pinching then
							// it's a zoom. But if they move in parallel it's a rotation
							pointerTracker.getCenterPoint( _centerPoint );
							pointerTracker.getStartCenterPoint( _startCenterPoint );

							// adjust the drag requirement by the dpr
							const dragThreshold = 2.0 * window.devicePixelRatio;
							const parallelDelta = _centerPoint.distanceTo( _startCenterPoint );
							if ( Math.abs( separateDelta ) > dragThreshold || parallelDelta > dragThreshold ) {

								if ( Math.abs( separateDelta ) > parallelDelta ) {

									this.setState( ZOOM );
									this.zoomDirectionSet = false;

								} else {

									this.setState( ROTATE );

								}

							}

						}

						if ( this.state === ZOOM ) {

							const previousDist = pointerTracker.getPreviousPointerDistance();
							this.zoomDelta += pointerDist - previousDist;

						} else if ( this.state === ROTATE ) {

							this.pivotMesh.visible = true;

						}

					} );

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

			const { pointerTracker } = this;
			pointerTracker.setHoverEvent( e );
			pointerTracker.updatePointer( e );

			this.dispatchEvent( _startEvent );

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

			this.dispatchEvent( _endEvent );

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

		this.domElement = null;

		if ( this._detachCallback ) {

			this._detachCallback();
			this._detachCallback = null;
			this.pointerTracker.reset();

		}

	}

	resetState() {

		if ( this.state !== NONE ) {

			this.dispatchEvent( _endEvent );

		}

		this.state = NONE;
		this.scene.remove( this.pivotMesh );
		this.pivotMesh.visible = true;
		this.actionHeightOffset = 0;

	}

	setState( state = this.state, fireEvent = true ) {

		if ( this.state === state ) {

			return;

		}

		if ( this.state === NONE && fireEvent ) {

			this.dispatchEvent( _startEvent );

		}

		this.state = state;

	}

	update() {

		if ( ! this.enabled || ! this.camera ) {

			return;

		}

		const {
			camera,
			cameraRadius,
			pivotPoint,
			up,
			state,
			adjustHeight,
		} = this;

		// update the actions
		if ( this.needsUpdate ) {

			const action = state;
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
			pivotPoint.addScaledVector( up, - actionHeightOffset );

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
				pivotPoint.addScaledVector( up, delta );
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
			minDistance,
			maxDistance,
			raycaster,
			pointerTracker,
			domElement,
			minZoom,
			maxZoom,
			zoomSpeed,
		} = this;

		let scale = this.zoomDelta;
		this.zoomDelta = 0;

		// get the latest hover / touch point
		if ( ! pointerTracker.getLatestPoint( _pointer ) ) {

			return;

		}

		if ( camera.isOrthographicCamera ) {

			// get the mouse position before zoom
			mouseToCoords( _pointer.x, _pointer.y, domElement, _mouseBefore );
			_mouseBefore.unproject( camera );

			// zoom the camera
			const normalizedDelta = Math.pow( 0.95, Math.abs( scale * 0.05 ) );
			const scaleFactor = scale > 0 ? 1 / Math.abs( normalizedDelta ) : normalizedDelta;

			camera.zoom = Math.max( minZoom, Math.min( maxZoom, camera.zoom * scaleFactor * zoomSpeed ) );
			camera.updateProjectionMatrix();

			// get the mouse position after zoom
			mouseToCoords( _pointer.x, _pointer.y, domElement, _mouseAfter );
			_mouseAfter.unproject( camera );

			// shift the camera on the near plane so the mouse is in the same spot
			camera.position.sub( _mouseAfter ).add( _mouseBefore );
			camera.updateMatrixWorld();

		} else {

			// initialize the zoom direction
			mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );
			raycaster.setFromCamera( _pointer, camera );
			zoomDirection.copy( raycaster.ray.direction ).normalize();
			this.zoomDirectionSet = true;

			// track the zoom direction we're going to use
			const finalZoomDirection = _vec.copy( zoomDirection );

			// always update the zoom target point in case the tiles are changing
			if ( this._updateZoomPoint() ) {

				const dist = zoomPoint.distanceTo( camera.position );

				// scale the distance based on how far there is to move
				if ( scale < 0 ) {

					const remainingDistance = Math.min( 0, dist - maxDistance );
					scale = scale * dist * zoomSpeed * 0.0025;
					scale = Math.max( scale, remainingDistance );

				} else {

					const remainingDistance = Math.max( 0, dist - minDistance );
					scale = scale * ( dist - minDistance ) * zoomSpeed * 0.0025;
					scale = Math.min( scale, remainingDistance );

				}

				camera.position.addScaledVector( zoomDirection, scale );
				camera.updateMatrixWorld();

			} else {

				// if we're zooming into nothing then use the distance from the ground to scale movement
				const hit = this._getPointBelowCamera();
				if ( hit ) {

					const dist = hit.distance;
					finalZoomDirection.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
					camera.position.addScaledVector( finalZoomDirection, scale * dist * 0.01 );
					camera.updateMatrixWorld();

				}

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
			zoomPoint,
		} = this;

		if ( ! zoomDirectionSet ) {

			return false;

		}

		raycaster.ray.origin.copy( camera.position );
		raycaster.ray.direction.copy( zoomDirection );

		const hit = this._raycast( raycaster );
		if ( hit ) {

			zoomPoint.copy( hit.point );
			this.zoomPointSet = true;
			return true;

		}

		return false;

	}

	// returns the point below the camera
	_getPointBelowCamera() {

		const { camera, raycaster, up } = this;
		raycaster.ray.direction.copy( up ).multiplyScalar( - 1 );
		raycaster.ray.origin.copy( camera.position ).addScaledVector( up, 1e5 );

		const hit = this._raycast( raycaster );
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
			pivotPoint,
			up,
			pointerTracker,
			domElement,
		} = this;

		// get the pointer and plane
		pointerTracker.getCenterPoint( _pointer );
		mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );

		_plane.setFromNormalAndCoplanarPoint( up, pivotPoint );
		raycaster.setFromCamera( _pointer, camera );

		// prevent the drag distance from getting too severe by limiting the drag point
		// to a reasonable angle with the drag plane
		if ( Math.abs( raycaster.ray.direction.dot( up ) ) < DRAG_PLANE_THRESHOLD ) {

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
		this.getUpDirection( pivotPoint, _localUp );
		if ( Math.abs( raycaster.ray.direction.dot( _localUp ) ) < DRAG_UP_THRESHOLD ) {

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

			_delta.subVectors( pivotPoint, _vec );
			this.camera.position.add( _delta );
			this.camera.updateMatrixWorld();

		}

	}

	_updateRotation() {

		const {
			camera,
			pivotPoint,
			minAltitude,
			maxAltitude,
			pointerTracker,
			rotationSpeed,
		} = this;

		// get the rotation motion and scale the rotation based on pixel ratio for consistency
		pointerTracker.getCenterPoint( _pointer );
		pointerTracker.getPreviousCenterPoint( _prevPointer );
		_deltaPointer.subVectors( _pointer, _prevPointer ).multiplyScalar( 0.02 / devicePixelRatio );

		const azimuth = - _deltaPointer.x * rotationSpeed;
		let altitude = _deltaPointer.y * rotationSpeed;

		// calculate current angles and clamp
		_forward
			.set( 0, 0, - 1 )
			.transformDirection( camera.matrixWorld )
			.multiplyScalar( - 1 );

		this.getUpDirection( pivotPoint, _localUp );

		// get the signed angle relative to the top down view
		_vec.crossVectors( _localUp, _forward ).normalize();
		_right.set( 1, 0, 0 ).transformDirection( camera.matrixWorld ).normalize();
		const sign = Math.sign( _vec.dot( _right ) );
		const angle = sign * _localUp.angleTo( _forward );

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
		makeRotateAroundPoint( pivotPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		// get a rotation axis for altitude and rotate
		_rotationAxis.set( - 1, 0, 0 ).transformDirection( camera.matrixWorld );

		_quaternion.setFromAxisAngle( _rotationAxis, altitude );
		makeRotateAroundPoint( pivotPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		// update the transform members
		camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

	}

	// sets the "up" axis for the current surface of the tile set
	_setFrame( newUp, pivot ) {

		const {
			up,
			camera,
			state,
			zoomPoint,
			zoomDirection,
			zoomDirectionSet,
			zoomPointSet,
			reorientOnDrag,
			reorientOnZoom
		} = this;

		camera.updateMatrixWorld();

		// get the amount needed to rotate
		_quaternion.setFromUnitVectors( up, newUp );

		// If we're zooming then reorient around the zoom point
		const action = state;
		if ( zoomDirectionSet && ( zoomPointSet || this._updateZoomPoint() ) ) {

			if ( reorientOnZoom ) {

				// rotates the camera position around the point being zoomed in to
				makeRotateAroundPoint( zoomPoint, _quaternion, _rotMatrix );
				camera.matrixWorld.premultiply( _rotMatrix );
				camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

				zoomDirection.subVectors( zoomPoint, camera.position ).normalize();

			}

		} else if ( action === DRAG && reorientOnDrag ) {

			// If we're dragging then reorient around the drag point

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

	_raycast( raycaster ) {

		const { scene, useFallbackPlane, fallbackPlane } = this;
		const result = raycaster.intersectObject( scene )[ 0 ] || null;
		if ( result ) {

			return result;

		} else if ( useFallbackPlane ) {

			// if we don't hit any geometry then try to intersect the fallback
			// plane so the camera can still be manipulated
			const plane = fallbackPlane;
			if ( raycaster.ray.intersectPlane( plane, _vec ) ) {

				const planeHit = {
					point: _vec.clone(),
					distance: raycaster.ray.origin.distanceTo( _vec ),
				};

				return planeHit;

			}

		}

		return null;

	}

}
