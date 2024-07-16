import { Matrix4, Ray, Vector3 } from 'three';

const _matrix = new Matrix4();
const _ray = new Ray();
const _vec = new Vector3();
const _vec2 = new Vector3();

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
export function mouseToCoords( clientX, clientY, element, target ) {

	target.x = ( ( clientX - element.offsetLeft ) / element.clientWidth ) * 2 - 1;
	target.y = - ( ( clientY - element.offsetTop ) / element.clientHeight ) * 2 + 1;

	if ( target.isVector3 ) {

		target.z = 0;

	}

}

// Returns an estimate of the closest point on the ellipsoid to the ray. Returns
// the surface intersection if they collide.
// TODO: this will possibly be unused
export function closestRayEllipsoidSurfacePointEstimate( ray, ellipsoid, target ) {

	if ( ellipsoid.intersectRay( ray, target ) ) {

		return target;

	} else {

		_matrix.makeScale( ...ellipsoid.radius ).invert();
		_ray.copy( ray ).applyMatrix4( _matrix );

		_vec.set( 0, 0, 0 );
		_ray.closestPointToPoint( _vec, target ).normalize();

		_matrix.makeScale( ...ellipsoid.radius );
		return target.applyMatrix4( _matrix );

	}

}

export function closestRaySpherePointRotation( ray, radius, target ) {

	const x = radius;
	const y = ray.origin.length();
	const theta = Math.acos( x / y );
	const cameraDir = _vec2.copy( ray.origin ).multiplyScalar( - 1 ).normalize();
	const rotationVec = _vec.crossVectors( cameraDir, ray.direction ).normalize();
	cameraDir.multiplyScalar( - 1 ).applyAxisAngle( rotationVec, - theta );
	target.copy( cameraDir );

}


// custom version of set raycaster from camera that relies on the underlying matrices
// so the ray origin is position at the camera near clip.
export function setRaycasterFromCamera( raycaster, mouse, camera ) {

	const { origin, direction } = raycaster.ray;
	origin
		.set( mouse.x, mouse.y, - 1 )
		.unproject( camera );

	direction
		.set( mouse.x, mouse.y, 0 )
		.unproject( camera )
		.sub( origin )
		.normalize();

	raycaster.camera = camera;

}
