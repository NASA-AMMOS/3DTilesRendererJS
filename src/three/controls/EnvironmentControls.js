import {
	Matrix4,
	Quaternion,
	Vector2,
	Vector3,
	Raycaster,
	Plane,
	EventDispatcher,
	MathUtils,
	Clock,
	Ray,
} from 'three';
import { PivotPointMesh } from './PivotPointMesh.js';
import { PointerTracker } from './PointerTracker.js';
import { mouseToCoords, makeRotateAroundPoint, setRaycasterFromCamera } from './utils.js';

export const NONE = 0;
export const DRAG = 1;
export const ROTATE = 2;
export const ZOOM = 3;
export const WAITING = 4;

const DRAG_PLANE_THRESHOLD = 0.05;
const DRAG_UP_THRESHOLD = 0.025;

const _rotMatrix = /* @__PURE__ */ new Matrix4();
const _delta = /* @__PURE__ */ new Vector3();
const _vec = /* @__PURE__ */ new Vector3();
const _forward = /* @__PURE__ */ new Vector3();
const _right = /* @__PURE__ */ new Vector3();
const _rotationAxis = /* @__PURE__ */ new Vector3();
const _quaternion = /* @__PURE__ */ new Quaternion();
const _plane = /* @__PURE__ */ new Plane();
const _localUp = /* @__PURE__ */ new Vector3();
const _mouseBefore = /* @__PURE__ */ new Vector3();
const _mouseAfter = /* @__PURE__ */ new Vector3();
const _identityQuat = /* @__PURE__ */ new Quaternion();
const _ray = /* @__PURE__ */ new Ray();

const _zoomPointPointer = /* @__PURE__ */ new Vector2();
const _pointer = /* @__PURE__ */ new Vector2();
const _prevPointer = /* @__PURE__ */ new Vector2();
const _deltaPointer = /* @__PURE__ */ new Vector2();
const _centerPoint = /* @__PURE__ */ new Vector2();
const _startCenterPoint = /* @__PURE__ */ new Vector2();

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

export class EnvironmentControls extends EventDispatcher {

	get enabled() {

		return this._enabled;

	}

	set enabled( v ) {

		if ( v !== this.enabled ) {

			this._enabled = v;
			this.resetState();
			this.pointerTracker.reset();

			if ( ! this.enabled ) {

				this.dragInertia.set( 0, 0, 0 );
				this.rotationInertia.set( 0, 0 );

			}

		}

	}

	constructor( scene = null, camera = null, domElement = null, tilesRenderer = null ) {

		super();

		this.isEnvironmentControls = true;

		this.domElement = null;
		this.camera = null;
		this.scene = null;
		this.tilesRenderer = null;

		// settings
		this._enabled = true;
		this.cameraRadius = 5;
		this.rotationSpeed = 1;
		this.minAltitude = 0;
		this.maxAltitude = 0.45 * Math.PI;
		this.minDistance = 10;
		this.maxDistance = Infinity;
		this.minZoom = 0;
		this.maxZoom = Infinity;
		this.zoomSpeed = 1;
		this.adjustHeight = true;
		this.enableDamping = false;
		this.dampingFactor = 0.15;

		// settings for GlobeControls
		this.reorientOnDrag = true;
		this.scaleZoomOrientationAtEdges = false;

		// internal state
		this.state = NONE;
		this.pointerTracker = new PointerTracker();
		this.needsUpdate = false;
		this.actionHeightOffset = 0;

		this.pivotPoint = new Vector3();

		// used for zoom
		this.zoomDirectionSet = false;
		this.zoomPointSet = false;
		this.zoomDirection = new Vector3();
		this.zoomPoint = new Vector3();
		this.zoomDelta = 0;

		// fields used for inertia
		this.rotationInertiaPivot = new Vector3();
		this.rotationInertia = new Vector2();
		this.dragInertia = new Vector3();
		this.inertiaTargetDistance = Infinity; 		// track the distance from the camera that we want to use to calculate the inertia end threshold
		this.inertiaStableFrames = 0; 				// the number of frames that the camera has not moved while the user is interacting

		// circular pivot mesh
		this.pivotMesh = new PivotPointMesh();
		this.pivotMesh.raycast = () => {};
		this.pivotMesh.scale.setScalar( 0.25 );

		// raycaster
		this.raycaster = new Raycaster();
		this.raycaster.firstHitOnly = true;

		this.up = new Vector3( 0, 1, 0 );
		this.clock = new Clock();

		this.fallbackPlane = new Plane( new Vector3( 0, 1, 0 ), 0 );
		this.useFallbackPlane = true;

		this._detachCallback = null;
		this._upInitialized = false;
		this._lastUsedState = NONE;
		this._zoomPointWasSet = false;

		// always update the zoom target point in case the tiles are changing
		this._tilesOnChangeCallback = () => this.zoomPointSet = false;

		// init
		if ( domElement ) this.attach( domElement );
		if ( camera ) this.setCamera( camera );
		if ( scene ) this.setScene( scene );
		if ( tilesRenderer ) this.setTilesRenderer( tilesRenderer );

	}

	setScene( scene ) {

		this.scene = scene;

	}

	setCamera( camera ) {

		this.camera = camera;
		this._upInitialized = false;
		this.zoomDirectionSet = false;
		this.zoomPointSet = false;
		this.needsUpdate = true;
		this.raycaster.camera = camera;
		this.resetState();

	}

	setTilesRenderer( tilesRenderer ) {

		// TODO: what if a scene has multiple tile sets?
		if ( this.tilesRenderer ) {

			this.tilesRenderer.removeEventListener( 'tile-visibility-change', this._tilesOnChangeCallback );

		}

		this.tilesRenderer = tilesRenderer;
		if ( this.tilesRenderer !== null ) {

			this.tilesRenderer.addEventListener( 'tile-visibility-change', this._tilesOnChangeCallback );

			if ( this.scene === null ) {

				this.setScene( this.tilesRenderer.group );

			}

		}

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

		const contextMenuCallback = e => {

			e.preventDefault();

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
				scene,
				pivotPoint,
				enabled,
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
			setRaycasterFromCamera( raycaster, _pointer, camera );

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
					pointerTracker.isLeftClicked() && e.shiftKey
				) {

					this.setState( pointerTracker.isPointerTouch() ? WAITING : ROTATE );

					pivotPoint.copy( hit.point );
					pivotMesh.position.copy( hit.point );
					pivotMesh.visible = pointerTracker.isPointerTouch() ? false : enabled;
					pivotMesh.updateMatrixWorld();
					scene.add( pivotMesh );

				} else if ( pointerTracker.isLeftClicked() ) {

					// if the clicked point is coming from below the plane then don't perform the drag
					this.setState( DRAG );
					pivotPoint.copy( hit.point );

					pivotMesh.position.copy( hit.point );
					pivotMesh.updateMatrixWorld();
					scene.add( pivotMesh );

				}

			}

		};

		let _pointerMoveQueued = false;
		const pointermoveCallback = e => {

			e.preventDefault();

			const {
				pivotMesh,
				enabled,
			} = this;

			// whenever the pointer moves we need to re-derive the zoom direction and point
			this.zoomDirectionSet = false;
			this.zoomPointSet = false;

			if ( this.state !== NONE ) {

				this.needsUpdate = true;

			}

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
						const startDist = pointerTracker.getStartTouchPointerDistance();
						const pointerDist = pointerTracker.getTouchPointerDistance();
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

							const previousDist = pointerTracker.getPreviousTouchPointerDistance();
							this.zoomDelta += pointerDist - previousDist;
							pivotMesh.visible = false;

						} else if ( this.state === ROTATE ) {

							pivotMesh.visible = enabled;

						}

					} );

				}

			}

			// TODO: we have the potential to fire change multiple times per frame - should we debounce?
			this.dispatchEvent( _changeEvent );

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

			// TODO: do we need events here?
			this.dispatchEvent( _startEvent );

			let delta;
			switch ( e.deltaMode ) {

				case 2: // Pages
					delta = e.deltaY * 800;
					break;
				case 1: // Lines
					delta = e.deltaY * 40;
					break;
				case 0: // Pixels
					delta = e.deltaY;
					break;

			}

			// use LOG to scale the scroll delta and hopefully normalize them across platforms
			const deltaSign = Math.sign( delta );
			const normalizedDelta = Math.abs( delta );
			this.zoomDelta -= 0.25 * deltaSign * normalizedDelta;
			this.needsUpdate = true;

			this._lastUsedState = ZOOM;
			this.dispatchEvent( _endEvent );

		};

		const pointerenterCallback = e => {

			const { pointerTracker } = this;

			if ( e.buttons !== pointerTracker.getPointerButtons() ) {

				pointerTracker.deletePointer( e );
				this.resetState();

			}

		};

		domElement.addEventListener( 'contextmenu', contextMenuCallback );
		domElement.addEventListener( 'pointerdown', pointerdownCallback );
		domElement.addEventListener( 'pointermove', pointermoveCallback );
		domElement.addEventListener( 'pointerup', pointerupCallback );
		domElement.addEventListener( 'wheel', wheelCallback, { passive: false } );
		domElement.addEventListener( 'pointerenter', pointerenterCallback );

		this._detachCallback = () => {

			domElement.removeEventListener( 'contextmenu', contextMenuCallback );
			domElement.removeEventListener( 'pointerdown', pointerdownCallback );
			domElement.removeEventListener( 'pointermove', pointermoveCallback );
			domElement.removeEventListener( 'pointerup', pointerupCallback );
			domElement.removeEventListener( 'wheel', wheelCallback );
			domElement.removeEventListener( 'pointerenter', pointerenterCallback );

		};

	}

	// override-able functions for retrieving the up direction at a point
	getUpDirection( point, target ) {

		target.copy( this.up );

	}

	getCameraUpDirection( target ) {

		this.getUpDirection( this.camera.position, target );

	}

	// returns the active / last used pivot point for the scene
	getPivotPoint( target ) {

		let result = null;

		// get the last interacted point as the focus
		if ( this._lastUsedState === ZOOM ) {

			if ( this._zoomPointWasSet ) {

				result = target.copy( this.zoomPoint );

			}

		} else if ( this._lastUsedState === ROTATE || this._lastUsedState === DRAG ) {

			result = target.copy( this.pivotPoint );

		}

		// If the last used point is outside the camera view then skip it
		const { camera, raycaster } = this;
		if ( result !== null ) {

			_vec.copy( result ).project( camera );
			if ( _vec.x < - 1 || _vec.x > 1 || _vec.y < - 1 || _vec.y > 1 ) {

				result = null;

			}

		}

		// default to the raycast hit if we have not result or the hit is closer to the camera
		// set a ray in the local ellipsoid frame
		setRaycasterFromCamera( raycaster, { x: 0, y: 0 }, camera );

		const hit = this._raycast( raycaster );
		if ( hit ) {

			if ( result === null || hit.distance < result.distanceTo( raycaster.ray.origin ) ) {

				result = target.copy( hit.point );

			}

		}

		return result;

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
		this.pivotMesh.removeFromParent();
		this.pivotMesh.visible = this.enabled;
		this.actionHeightOffset = 0;

	}

	setState( state = this.state, fireEvent = true ) {

		if ( this.state === state ) {

			return;

		}

		if ( this.state === NONE && fireEvent ) {

			this.dispatchEvent( _startEvent );

		}

		this.pivotMesh.visible = this.enabled;
		this.dragInertia.set( 0, 0, 0 );
		this.rotationInertia.set( 0, 0 );
		this.inertiaStableFrames = 0;
		this.state = state;

		if ( state !== NONE && state !== WAITING ) {

			this._lastUsedState = state;

		}

	}

	update( deltaTime = Math.min( this.clock.getDelta(), 64 / 1000 ) ) {

		if ( ! this.enabled || ! this.camera || deltaTime === 0 ) {

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

		camera.updateMatrixWorld();

		// set the "up" vector immediately so it's available in the following functions
		this.getCameraUpDirection( _localUp );
		if ( ! this._upInitialized ) {

			this._upInitialized = true;
			this.up.copy( _localUp );

		}

		// update the actions
		const inertiaNeedsUpdate = this._inertiaNeedsUpdate();
		if ( this.needsUpdate || inertiaNeedsUpdate ) {

			const zoomDelta = this.zoomDelta;

			this._updateZoom();
			this._updatePosition( deltaTime );
			this._updateRotation( deltaTime );

			if ( state === DRAG || state === ROTATE ) {

				_forward.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
				this.inertiaTargetDistance = _vec.copy( this.pivotPoint ).sub( camera.position ).dot( _forward );

			} else if ( state === NONE ) {

				this._updateInertia( deltaTime );

			}

			if ( state !== NONE || zoomDelta !== 0 || inertiaNeedsUpdate ) {

				this.dispatchEvent( _changeEvent );

			}

			this.needsUpdate = false;

		}

		// update the up direction based on where the camera moved to
		// if using an orthographic camera then rotate around drag pivot
		// reuse the "hit" information since it can be slow to perform multiple hits
		const hit = camera.isOrthographicCamera ? null : adjustHeight && this._getPointBelowCamera() || null;
		const rotationPoint = camera.isOrthographicCamera ? pivotPoint : hit && hit.point || null;
		this.getCameraUpDirection( _localUp );
		this._setFrame( _localUp, rotationPoint );

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

	// updates the camera to position it based on the constraints of the controls
	adjustCamera( camera ) {

		const { adjustHeight, cameraRadius } = this;
		if ( camera.isPerspectiveCamera ) {

			// adjust the camera height
			this.getUpDirection( camera.position, _localUp );
			const hit = adjustHeight && this._getPointBelowCamera( camera.position, _localUp ) || null;
			if ( hit ) {

				const dist = hit.distance;
				if ( dist < cameraRadius ) {

					camera.position.addScaledVector( _localUp, cameraRadius - dist );

				}

			}

		}

	}

	dispose() {

		this.detach();

	}

	// private
	_updateInertia( deltaTime ) {

		// update the damping of momentum variables
		const {
			rotationInertia,
			pivotPoint,
			dragInertia,
			enableDamping,
			dampingFactor,
			camera,
			cameraRadius,
			minDistance,
			inertiaTargetDistance,
		} = this;

		if ( ! this.enableDamping || this.inertiaStableFrames > 1 ) {

			dragInertia.set( 0, 0, 0 );
			rotationInertia.set( 0, 0, 0 );
			return;

		}

		// Based on Freya Holmer's frame-rate independent lerp function
		const factor = Math.pow( 2, - deltaTime / dampingFactor );
		const stableDistance = Math.max( camera.near, cameraRadius, minDistance, inertiaTargetDistance );
		const resolution = 2 * 1e3;
		const pixelWidth = 2 / resolution;
		const pixelThreshold = 0.25 * pixelWidth;

		// scale the residual rotation motion
		if ( rotationInertia.lengthSq() > 0 ) {

			// calculate two screen points at 1 pixel apart in our notional resolution so we can stop when the delta is ~ 1 pixel
			// projected into world space
			setRaycasterFromCamera( _ray, _vec.set( 0, 0, - 1 ), camera );
			_ray.applyMatrix4( camera.matrixWorldInverse );
			_ray.direction.normalize();
			_ray.recast( - _ray.direction.dot( _ray.origin ) ).at( stableDistance / _ray.direction.z, _vec );
			_vec.applyMatrix4( camera.matrixWorld );

			setRaycasterFromCamera( _ray, _delta.set( pixelThreshold, pixelThreshold, - 1 ), camera );
			_ray.applyMatrix4( camera.matrixWorldInverse );
			_ray.direction.normalize();
			_ray.recast( - _ray.direction.dot( _ray.origin ) ).at( stableDistance / _ray.direction.z, _delta );
			_delta.applyMatrix4( camera.matrixWorld );

			// get implied angle
			_vec.sub( pivotPoint ).normalize();
			_delta.sub( pivotPoint ).normalize();

			// calculate the rotation threshold
			const threshold = _vec.angleTo( _delta ) / deltaTime;
			rotationInertia.multiplyScalar( factor );
			if ( rotationInertia.lengthSq() < threshold ** 2 || ! enableDamping ) {

				rotationInertia.set( 0, 0 );

			}

		}

		// scale the residual translation motion
		if ( dragInertia.lengthSq() > 0 ) {

			// calculate two screen points at 1 pixel apart in our notional resolution so we can stop when the delta is ~ 1 pixel
			// projected into world space
			setRaycasterFromCamera( _ray, _vec.set( 0, 0, - 1 ), camera );
			_ray.applyMatrix4( camera.matrixWorldInverse );
			_ray.direction.normalize();
			_ray.recast( - _ray.direction.dot( _ray.origin ) ).at( stableDistance / _ray.direction.z, _vec );
			_vec.applyMatrix4( camera.matrixWorld );

			setRaycasterFromCamera( _ray, _delta.set( pixelThreshold, pixelThreshold, - 1 ), camera );
			_ray.applyMatrix4( camera.matrixWorldInverse );
			_ray.direction.normalize();
			_ray.recast( - _ray.direction.dot( _ray.origin ) ).at( stableDistance / _ray.direction.z, _delta );
			_delta.applyMatrix4( camera.matrixWorld );

			// calculate movement threshold
			const threshold = _vec.distanceTo( _delta ) / deltaTime;
			dragInertia.multiplyScalar( factor );
			if ( dragInertia.lengthSq() < threshold ** 2 || ! enableDamping ) {

				dragInertia.set( 0, 0, 0 );

			}

		}

		// apply the inertia changes
		if ( rotationInertia.lengthSq() > 0 ) {

			this._applyRotation( rotationInertia.x * deltaTime, rotationInertia.y * deltaTime, pivotPoint );

		}

		if ( dragInertia.lengthSq() > 0 ) {

			camera.position.addScaledVector( dragInertia, deltaTime );
			camera.updateMatrixWorld();

		}

	}

	_inertiaNeedsUpdate() {

		const { rotationInertia, dragInertia } = this;
		return rotationInertia.lengthSq() !== 0 || dragInertia.lengthSq() !== 0;

	}

	_updateZoom() {

		const {
			zoomPoint,
			zoomDirection,
			camera,
			minDistance,
			maxDistance,
			pointerTracker,
			domElement,
			minZoom,
			maxZoom,
			zoomSpeed,
			state,
		} = this;

		let scale = this.zoomDelta;
		this.zoomDelta = 0;

		// get the latest hover / touch point
		if ( ! pointerTracker.getLatestPoint( _pointer ) || ( scale === 0 && state !== ZOOM ) ) {

			return;

		}

		// reset momentum
		this.rotationInertia.set( 0, 0 );
		this.dragInertia.set( 0, 0, 0 );

		if ( camera.isOrthographicCamera ) {

			// update the zoom direction
			this._updateZoomDirection();

			// zoom straight into the globe if we haven't hit anything
			const zoomIntoPoint = this.zoomPointSet || this._updateZoomPoint();

			// get the mouse position before zoom
			_mouseBefore.unproject( camera );

			// zoom the camera
			const normalizedDelta = Math.pow( 0.95, Math.abs( scale * 0.05 ) );
			let scaleFactor = scale > 0 ? 1 / Math.abs( normalizedDelta ) : normalizedDelta;
			scaleFactor *= zoomSpeed;

			if ( scaleFactor > 1 ) {

				if ( maxZoom < camera.zoom * scaleFactor ) {

					scaleFactor = 1;

				}

			} else {

				if ( minZoom > camera.zoom * scaleFactor ) {

					scaleFactor = 1;

				}

			}

			camera.zoom *= scaleFactor;
			camera.updateProjectionMatrix();

			// adjust the surface point to be in the same position if the globe is hovered over
			if ( zoomIntoPoint ) {

				// get the mouse position after zoom
				mouseToCoords( _pointer.x, _pointer.y, domElement, _mouseAfter );
				_mouseAfter.unproject( camera );

				// shift the camera on the near plane so the mouse is in the same spot
				camera.position.sub( _mouseAfter ).add( _mouseBefore );
				camera.updateMatrixWorld();

			}

		} else {

			// initialize the zoom direction
			this._updateZoomDirection();

			// track the zoom direction we're going to use
			const finalZoomDirection = _vec.copy( zoomDirection );

			if ( this.zoomPointSet || this._updateZoomPoint() ) {

				const dist = zoomPoint.distanceTo( camera.position );

				// scale the distance based on how far there is to move
				if ( scale < 0 ) {

					const remainingDistance = Math.min( 0, dist - maxDistance );
					scale = scale * dist * zoomSpeed * 0.0025;
					scale = Math.max( scale, remainingDistance );

				} else {

					const remainingDistance = Math.max( 0, dist - minDistance );
					scale = scale * Math.max( dist - minDistance, 0 ) * zoomSpeed * 0.0025;
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

	_updateZoomDirection() {

		if ( this.zoomDirectionSet ) {

			return;

		}

		const { domElement, raycaster, camera, zoomDirection, pointerTracker } = this;
		pointerTracker.getLatestPoint( _pointer );
		mouseToCoords( _pointer.x, _pointer.y, domElement, _mouseBefore );
		setRaycasterFromCamera( raycaster, _mouseBefore, camera );
		zoomDirection.copy( raycaster.ray.direction ).normalize();
		this.zoomDirectionSet = true;

	}

	// update the point being zoomed in to based on the zoom direction
	_updateZoomPoint() {

		const {
			camera,
			zoomDirectionSet,
			zoomDirection,
			raycaster,
			zoomPoint,
			pointerTracker,
			domElement,
		} = this;

		this._zoomPointWasSet = false;

		if ( ! zoomDirectionSet ) {

			return false;

		}

		// If using an orthographic camera we have to account for the mouse position when picking the point
		if ( camera.isOrthographicCamera && pointerTracker.getLatestPoint( _zoomPointPointer ) ) {

			mouseToCoords( _zoomPointPointer.x, _zoomPointPointer.y, domElement, _zoomPointPointer );
			setRaycasterFromCamera( raycaster, _zoomPointPointer, camera );

		} else {

			raycaster.ray.origin.copy( camera.position );
			raycaster.ray.direction.copy( zoomDirection );
			raycaster.near = 0;
			raycaster.far = Infinity;

		}

		// get the hit point
		const hit = this._raycast( raycaster );
		if ( hit ) {

			zoomPoint.copy( hit.point );
			this.zoomPointSet = true;
			this._zoomPointWasSet = true;
			return true;

		}

		return false;

	}

	// returns the point below the camera
	_getPointBelowCamera( point = this.camera.position, up = this.up ) {

		const { raycaster } = this;
		raycaster.ray.direction.copy( up ).multiplyScalar( - 1 );
		raycaster.ray.origin.copy( point ).addScaledVector( up, 1e5 );
		raycaster.near = 0;
		raycaster.far = Infinity;

		const hit = this._raycast( raycaster );
		if ( hit ) {

			hit.distance -= 1e5;

		}

		return hit;

	}

	// update the drag action
	_updatePosition( deltaTime ) {

		const {
			raycaster,
			camera,
			pivotPoint,
			up,
			pointerTracker,
			domElement,
			state,
			dragInertia,
		} = this;

		if ( state === DRAG ) {

			// get the pointer and plane
			pointerTracker.getCenterPoint( _pointer );
			mouseToCoords( _pointer.x, _pointer.y, domElement, _pointer );

			_plane.setFromNormalAndCoplanarPoint( up, pivotPoint );
			setRaycasterFromCamera( raycaster, _pointer, camera );

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
				camera.position.add( _delta );
				camera.updateMatrixWorld();

				// update the drag inertia
				_delta.multiplyScalar( 1 / deltaTime );
				if ( pointerTracker.getMoveDistance() / deltaTime < 2 * window.devicePixelRatio ) {

					this.inertiaStableFrames ++;

				} else {

					dragInertia.copy( _delta );
					this.inertiaStableFrames = 0;

				}

			}

		}

	}

	_updateRotation( deltaTime ) {

		const {
			pivotPoint,
			pointerTracker,
			domElement,
			state,
			rotationInertia,
		} = this;

		if ( state === ROTATE ) {

			// get the rotation motion and divide out the container height to normalize for element size
			pointerTracker.getCenterPoint( _pointer );
			pointerTracker.getPreviousCenterPoint( _prevPointer );
			_deltaPointer.subVectors( _pointer, _prevPointer ).multiplyScalar( 2 * Math.PI / domElement.clientHeight );

			this._applyRotation( _deltaPointer.x, _deltaPointer.y, pivotPoint );

			// update rotation inertia
			_deltaPointer.multiplyScalar( 1 / deltaTime );
			if ( pointerTracker.getMoveDistance() / deltaTime < 2 * window.devicePixelRatio ) {

				this.inertiaStableFrames ++;

			} else {

				rotationInertia.copy( _deltaPointer );
				this.inertiaStableFrames = 0;

			}

		}

	}

	_applyRotation( x, y, pivotPoint ) {

		if ( x === 0 && y === 0 ) {

			return;

		}

		const {
			camera,
			minAltitude,
			maxAltitude,
			rotationSpeed,
		} = this;

		const azimuth = - x * rotationSpeed;
		let altitude = y * rotationSpeed;

		// calculate current angles and clamp
		_forward.set( 0, 0, 1 ).transformDirection( camera.matrixWorld );

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
			zoomDirectionSet,
			zoomPointSet,
			reorientOnDrag,
			scaleZoomOrientationAtEdges,
		} = this;

		camera.updateMatrixWorld();

		// get the amount needed to rotate
		_quaternion.setFromUnitVectors( up, newUp );

		// If we're zooming then reorient around the zoom point
		const action = state;
		if ( zoomDirectionSet && ( zoomPointSet || this._updateZoomPoint() ) ) {

			this.getUpDirection( zoomPoint, _vec );

			if ( scaleZoomOrientationAtEdges ) {

				let amt = Math.max( _vec.dot( up ) - 0.6, 0 ) / 0.4;
				amt = MathUtils.mapLinear( amt, 0, 0.5, 0, 1 );
				amt = Math.min( amt, 1 );

				// scale the value if we're using an orthographic camera so
				// GlobeControls works correctly
				if ( camera.isOrthographicCamera ) {

					amt *= 0.1;

				}

				_quaternion.slerp( _identityQuat, 1.0 - amt );

			}

			// rotates the camera position around the point being zoomed in to
			makeRotateAroundPoint( zoomPoint, _quaternion, _rotMatrix );
			camera.matrixWorld.premultiply( _rotMatrix );
			camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );

			// recompute the zoom direction after updating rotation to align with frame
			this.zoomDirectionSet = false;
			this._updateZoomDirection();

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
