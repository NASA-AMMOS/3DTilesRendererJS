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
