import { Matrix4, Quaternion, Vector2, Vector3, Raycaster, Ray, Mesh, SphereGeometry } from 'three';

const NONE = 0;
const DRAG = 1;
const ROTATE = 2;

const _delta = new Vector3();
const _vec = new Vector3();
const _cross = new Vector3();
const _quaternion = new Quaternion();
const _matrix = new Matrix4();
const _ray = new Ray();

const _rotMatrix = new Matrix4();


// TODO
// - Update the containing frame every frame (maintain height)
// - To start just use a group that the camera is added to
export class GlobeControls {

	constructor( scene, camera, domElement ) {

		this.camera = camera;
		this.domElement = null;
		this.scene = scene;

		this.state = NONE;
		this.frame = new Matrix4();
		this.cameraRadius = 1;

		this.pivotPointSet = false;
		this.pivotPoint = new Vector3();
		this.pivotDirectionSet = false;
		this.pivotDirection = new Vector3();

		this.rotationSpeed = 3;
		this.raycaster = new Raycaster();
		this.raycaster.firstHitOnly = true;

		this.sphere = new Mesh( new SphereGeometry() );
		this.sphere.scale.setScalar( 0.25 );

		this.attach( domElement );

	}

	attach( domElement ) {

		this.domElement = domElement;

		const _pointer = new Vector2();
		const _newPointer = new Vector2();
		const _delta = new Vector2();

		domElement.addEventListener( 'pointerdown', e => {

			const { camera, raycaster, domElement, scene } = this;

			_pointer.x = ( e.clientX / domElement.clientWidth ) * 2 - 1;
			_pointer.y = - ( e.clientY / domElement.clientHeight ) * 2 + 1;

			raycaster.setFromCamera( _pointer, camera );

			const hit = raycaster.intersectObject( scene )[ 0 ] || null;
			if ( hit ) {

				this.state = ROTATE;
				this.pivotPoint.copy( hit.point );
				this.pivotPointSet = true;

				this.sphere.position.copy( hit.point );
				this.scene.add( this.sphere );

			}

		} );

		domElement.addEventListener( 'pointermove', e => {

			_newPointer.x = ( e.clientX / domElement.clientWidth ) * 2 - 1;
			_newPointer.y = - ( e.clientY / domElement.clientHeight ) * 2 + 1;

			_delta.subVectors( _newPointer, _pointer );
			_pointer.copy( _newPointer );

			if ( this.state === ROTATE ) {

				const { rotationSpeed } = this;
				this.updateRotation( - _delta.x * rotationSpeed, - _delta.y * rotationSpeed );

			}

		} );

		domElement.addEventListener( 'pointerup', e => {

			this.state = NONE;
			this.pivotPointSet = false;
			this.scene.remove( this.sphere );

		} );

		domElement.addEventListener( 'wheel', e => {

			this.raycaster.setFromCamera( _pointer, this.camera );
			this.pivotDirection.copy( this.raycaster.ray.direction ).normalize();

			this.updateZoom( - e.deltaY );

		} );

		domElement.addEventListener( 'pointerenter', e => {

			_pointer.x = ( e.clientX / domElement.clientWidth ) * 2 - 1;
			_pointer.y = - ( e.clientY / domElement.clientHeight ) * 2 + 1;

			if ( ! ( e.buttons & 1 ) ) {

				this.state = NONE;
				this.pivotPointSet = false;
				this.scene.remove( this.sphere );

			}

		} );

	}

	detach() {}

	updateZoom( scale ) {

		const { pivotPointSet, pivotPoint, pivotDirection, camera, raycaster, scene } = this;

		let dist = Infinity;
		if ( pivotPointSet ) {

			dist = pivotPoint.distanceTo( camera.position );

		} else {

			raycaster.ray.origin.copy( camera.position );
			raycaster.ray.direction.copy( pivotDirection );

			const hit = raycaster.intersectObject( scene )[ 0 ] || null;
			if ( hit ) {

				dist = hit.distance;

			}

		}

		pivotDirection.normalize();
		scale = Math.min( scale * ( dist - 5 ) * 0.01, Math.max( 0, dist - 5 ) );

		this.camera.position.addScaledVector( pivotDirection, scale );

	}

	updatePosition() {

		// TODO: when adjusting the frame we have to reproject the grab point
		// so as the use drags it winds up in the same spot.
		// Will this work? Or be good enough?

	}

	updateRotation( azimuth, altitude ) {

		const { camera, pivotPoint } = this;

		// zoom in frame around pivot point
		_vec.set( 0, 1, 0 );
		_quaternion.setFromAxisAngle( _vec, azimuth );
		makeRotateAroundPoint( pivotPoint, _quaternion, _rotMatrix );
		camera.matrixWorld.premultiply( _rotMatrix );

		_delta.set( 0, 0, - 1 ).transformDirection( camera.matrixWorld );
		_cross.crossVectors( _vec, _delta ).normalize();

		_quaternion.setFromAxisAngle( _cross, altitude );
		makeRotateAroundPoint( pivotPoint, _quaternion, _rotMatrix );
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

function makeRotateAroundPoint( point, quat, target ) {

	target.makeTranslation( - point.x, - point.y, - point.z );

	_matrix.makeRotationFromQuaternion( quat );
	target.premultiply( _matrix );

	_matrix.makeTranslation( point.x, point.y, point.z );
	target.premultiply( _matrix );

	return target;

}
