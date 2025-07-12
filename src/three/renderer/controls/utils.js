import { Matrix4, Ray, Vector3 } from 'three';

const _matrix = new Matrix4();
const _ray = new Ray();
const _vec = new Vector3();

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

// find the closest ray on the horizon when the ray passes above the sphere
export function closestRaySpherePointFromRotation( ray, radius, target ) {

	const hypotenuse = ray.origin.length();

	// angle inside the sphere
	const theta = Math.acos( radius / hypotenuse );

	// the direction to the camera
	target
		.copy( ray.origin )
		.multiplyScalar( - 1 )
		.normalize();

	// get the normal of the plane the ray and origin lie in
	const rotationVec = _vec
		.crossVectors( target, ray.direction )
		.normalize();

	// rotate the camera direction by angle and scale it to the surface
	target
		.multiplyScalar( - 1 )
		.applyAxisAngle( rotationVec, - theta )
		.normalize()
		.multiplyScalar( radius );

}


// custom version of set raycaster from camera that relies on the underlying matrices
// so the ray origin is position at the camera near clip.
export function setRaycasterFromCamera( raycaster, coords, camera ) {

	const ray = raycaster instanceof Ray ? raycaster : raycaster.ray;
	const { origin, direction } = ray;

	// get the origin and direction of the frustum ray
	origin
		.set( coords.x, coords.y, - 1 )
		.unproject( camera );

	direction
		.set( coords.x, coords.y, 1 )
		.unproject( camera )
		.sub( origin );

	if ( ! raycaster.isRay ) {

		// compute the far value based on the distance from point on the near
		// plane and point on the far plane. Then normalize the direction.
		raycaster.near = 0;
		raycaster.far = direction.length();
		raycaster.camera = camera;

	}

	// normalize the ray direction
	direction.normalize();

}
