import { Matrix4, Quaternion, Vector2, Vector3, Raycaster, Ray, Mesh, SphereGeometry, Plane } from 'three';

const NONE = 0;
const DRAG = 1;
const ROTATE = 2;

const _matrix = new Matrix4();
const _rotMatrix = new Matrix4();
const _delta = new Vector3();
const _vec = new Vector3();
const _crossVec = new Vector3();
const _quaternion = new Quaternion();
const _ray = new Ray();
const _plane = new Plane();

// TODO
// - Ensure rotation can not flp the opposite direction (clamp rotations)
// - Add angle limits
// - Adjust the camera height (possibly need to tilt or something based on which move mode is being used?)
// ---
// - Toggles for zoom to cursor, zoom forward, orbit around center, etc
// - Touch controls
// - Add support for angled rotation plane (based on where the pivot point is)
// - Test with globe (adjusting up vector)
// - Add drift animation
export class GlobeControls {

	constructor( scene, camera, domElement ) {

		this.domElement = null;
		this.camera = null;
		this.scene = null;

		// settings
		this.state = NONE;
		this.cameraRadius = 1;
		this.rotationSpeed = 3;

		// group to display (TODO: make callback instead)
		this.sphere = new Mesh( new SphereGeometry() );
		this.sphere.raycast = () => {};
		this.sphere.scale.setScalar( 0.25 );

		// internal state
		this.dragPointSet = false;
		this.dragPoint = new Vector3();

		this.rotationPointSet = false;
		this.rotationPoint = new Vector3();

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

		const _pointer = new Vector2();
		const _newPointer = new Vector2();
		const _deltaPointer = new Vector2();
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

			mouseToCoords( e, domElement, _pointer );
			raycaster.setFromCamera( _pointer, camera );

			const hit = raycaster.intersectObject( scene )[ 0 ] || null;
			if ( hit ) {

				if ( e.buttons & 2 || e.buttons & 1 && shiftClicked ) {

					this.state = ROTATE;
					this.rotationPoint.copy( hit.point );
					this.rotationPointSet = true;

					this.sphere.position.copy( hit.point );
					this.scene.add( this.sphere );

				} else if ( e.buttons & 1 ) {

					this.state = DRAG;
					this.dragPoint.copy( hit.point );
					this.dragPointSet = true;

					this.sphere.position.copy( hit.point );
					this.scene.add( this.sphere );

				}

			}

		};

		const pointermoveCallback = e => {

			this.zoomDirectionSet = false;
			this.zoomPointSet = false;

			mouseToCoords( e, domElement, _newPointer );
			_deltaPointer.subVectors( _newPointer, _pointer );
			_pointer.copy( _newPointer );

			if ( this.state === DRAG ) {

				const { raycaster, camera, dragPoint } = this;
				_vec.set( 0, 1, 0 ); // up vector
				_plane.setFromNormalAndCoplanarPoint( _vec, dragPoint );
				raycaster.setFromCamera( _pointer, camera );

				if ( raycaster.ray.intersectPlane( _plane, _vec ) ) {

					_delta.subVectors( dragPoint, _vec );
					this.updatePosition( _delta );

				}

			} else if ( this.state === ROTATE ) {

				const { rotationSpeed } = this;
				this.updateRotation( - _deltaPointer.x * rotationSpeed, - _deltaPointer.y * rotationSpeed );

			}

		};

		const pointerupCallback = e => {

			this.state = NONE;
			this.rotationPointSet = false;
			this.dragPointSet = false;
			this.scene.remove( this.sphere );

		};

		const wheelCallback = e => {

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

			this.updateZoom( - e.deltaY );

		};

		const pointerenterCallback = e => {

			mouseToCoords( e, domElement, _pointer );
			shiftClicked = false;

			if ( e.buttons === 0 ) {

				this.state = NONE;
				this.dragPointSet = false;
				this.rotationPointSet = false;
				this.scene.remove( this.sphere );

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
		} = this;

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
		scale = Math.min( scale * ( dist - 5 ) * 0.01, Math.max( 0, dist - 5 ) );

		this.camera.position.addScaledVector( zoomDirection, scale );

	}

	updatePosition( delta ) {

		// TODO: when adjusting the frame we have to reproject the grab point
		// so as the use drags it winds up in the same spot.
		// Will this work? Or be good enough?
		this.camera.position.add( delta );

	}

	updateRotation( azimuth, altitude ) {

		const { camera, rotationPoint } = this;

		// zoom in frame around pivot point
		_vec.set( 0, 1, 0 );
		_quaternion.setFromAxisAngle( _vec, azimuth );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		_delta.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
		_crossVec.crossVectors( _vec, _delta ).normalize();

		_quaternion.setFromAxisAngle( _crossVec, altitude );
		makeRotateAroundPoint( rotationPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		camera.matrixWorld.decompose( camera.position, camera.quaternion, _vec );
		camera.updateMatrixWorld();

	}

	update() {

	}

	dispose() {

		this.detach();

	}

	_raycast( o, d ) {

		const { scene } = this;
		const raycaster = new Raycaster();
		const { ray } = raycaster;
		ray.direction.copy( d );
		ray.origin.copy( o );

		return raycaster.intersectObject( scene )[ 0 ] || null;

	}

	_updateCameraPosition() {

		const { camera } = this;
		_ray.direction.set( 0, - 1, 0 );
		_ray.origin.copy( camera.position ).addScaledVector( _ray.direction, - 100 );

		const hit = this._raycast( _ray.origin, _ray.direction );
		if ( hit && hit.point.distanceTo( camera.position ) < this.cameraRadius ) {

			camera.position.hit.point.addScaledVector( _ray.direction, - this.cameraRadius );

		}

	}

}

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
function mouseToCoords( e, element, target ) {

	target.x = ( e.clientX / element.clientWidth ) * 2 - 1;
	target.y = - ( e.clientY / element.clientHeight ) * 2 + 1;

}
