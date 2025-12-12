import { Matrix4, Vector3, Box3, Ray, Plane } from 'three';
import { Ellipsoid } from './Ellipsoid.js';

// bounds are lightly inflated to account for floating point error
const INFLATE_EPSILON = 1e-13;
const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = /* @__PURE__*/ new Vector3();
const _orthoY = /* @__PURE__*/ new Vector3();
const _orthoZ = /* @__PURE__*/ new Vector3();
const _vec = /* @__PURE__*/ new Vector3();
const _invMatrix = /* @__PURE__*/ new Matrix4();
const _box = /* @__PURE__*/ new Box3();
const _matrix = /* @__PURE__*/ new Matrix4();
const _ray = /* @__PURE__*/ new Ray();
const _scaleMatrix = /* @__PURE__*/ new Matrix4();
const _point = /* @__PURE__*/ new Vector3();
const _cartographic = {};
const _plane = /* @__PURE__*/ new Plane();
const _planeNormal = /* @__PURE__*/ new Vector3();

function expandSphereRadiusSquared( vec, target ) {

	target.radius = Math.max( target.radius, vec.distanceToSquared( target.center ) );

}

function isTriaxial( radii ) {

	return radii.x !== radii.y;

}

// intersects a ray with a cone around the Z-axis at a given latitude
// the cone is defined by the equation: (x² + y²) = (z * cot(lat))²
// returns the closest intersection point, or null if no intersection
function intersectRayWithLatitudeCone( ray, lat, target ) {

	// Extract ray components for clarity
	const origin = ray.origin;
	const dir = ray.direction;

	// Cone parameter: k = cot(lat) = cos(lat) / sin(lat)
	const k = Math.cos( lat ) / Math.sin( lat );
	const kSq = k * k;

	// Substitute ray equation into cone equation and solve quadratic: a*t² + b*t + c = 0
	// Ray: (x,y,z) = (ox,oy,oz) + t*(dx,dy,dz)
	// Cone: x² + y² = (z*k)²
	// Expanding: (ox + t*dx)² + (oy + t*dy)² = ((oz + t*dz)*k)²
	const a = dir.x ** 2 + dir.y ** 2 - kSq * ( dir.z ** 2 );
	const b = 2 * ( origin.x * dir.x + origin.y * dir.y - kSq * origin.z * dir.z );
	const c = origin.x ** 2 + origin.y ** 2 - kSq * ( origin.z ** 2 );
	const discriminant = b * b - 4 * a * c;

	// No intersection if discriminant is negative
	if ( discriminant < 0 ) {

		return null;

	}

	const sqrtDiscriminant = Math.sqrt( discriminant );
	const t1 = ( - b - sqrtDiscriminant ) / ( 2 * a );
	const t2 = ( - b + sqrtDiscriminant ) / ( 2 * a );

	// Find the closest non-negative intersection
	let t;
	if ( t1 >= 0 && t2 >= 0 ) {

		t = Math.min( t1, t2 );

	} else if ( t1 >= 0 ) {

		t = t1;

	} else if ( t2 >= 0 ) {

		t = t2;

	} else {

		return null;

	}

	// Calculate and return the intersection point
	return ray.at( t, target );

}

export class EllipsoidRegion extends Ellipsoid {

	constructor(
		x = 1, y = 1, z = 1,
		latStart = - HALF_PI, latEnd = HALF_PI,
		lonStart = 0, lonEnd = 2 * PI,
		heightStart = 0, heightEnd = 0
	) {

		super( x, y, z );
		this.latStart = latStart;
		this.latEnd = latEnd;
		this.lonStart = lonStart;
		this.lonEnd = lonEnd;
		this.heightStart = heightStart;
		this.heightEnd = heightEnd;

	}

	getBoundingBox( box, matrix ) {

		if ( isTriaxial( this.radius ) ) {

			console.warn( 'EllipsoidRegion: Triaxial ellipsoids are not supported.' );

		}

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const latMid = ( latStart + latEnd ) * 0.5;
		const lonMid = ( lonStart + lonEnd ) * 0.5;
		const allAboveEquator = latStart > 0.0;
		const allBelowEquator = latEnd < 0.0;

		let nearEquatorLat;
		if ( allAboveEquator ) {

			nearEquatorLat = latStart;

		} else if ( allBelowEquator ) {

			nearEquatorLat = latEnd;

		} else {

			nearEquatorLat = 0;

		}

		// measure the extents
		const { min, max } = box;
		min.setScalar( Infinity );
		max.setScalar( - Infinity );
		if ( lonEnd - lonStart <= PI ) {

			// extract the axes
			this.getCartographicToNormal( latMid, lonMid, _orthoZ );
			_orthoY.set( 0, 0, 1 );
			_orthoX.crossVectors( _orthoY, _orthoZ ).normalize();
			_orthoY.crossVectors( _orthoZ, _orthoX ).normalize();

			// construct the frame
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );
			_invMatrix.copy( matrix ).invert();

			// extract x
			// check the most bowing point near the equator relative to the frame
			this.getCartographicToPosition( nearEquatorLat, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.x = Math.abs( _vec.x );
			min.x = - max.x;

			// extract y
			// check corners and mid points for the top
			this.getCartographicToPosition( latEnd, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.y = _vec.y;

			this.getCartographicToPosition( latEnd, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.y = Math.max( _vec.y, max.y );

			// check corners and mid points for the bottom
			this.getCartographicToPosition( latStart, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.y = _vec.y;

			this.getCartographicToPosition( latStart, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.y = Math.min( _vec.y, min.y );

			// extract z
			// check center point
			this.getCartographicToPosition( latMid, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.z = _vec.z;

			// check top and bottom reverse points
			this.getCartographicToPosition( latStart, lonStart, heightStart, _vec ).applyMatrix4( _invMatrix );
			min.z = _vec.z;

			this.getCartographicToPosition( latEnd, lonStart, heightStart, _vec ).applyMatrix4( _invMatrix );
			min.z = Math.min( _vec.z, min.z );

		} else {

			// extract a vector towards the middle of the region
			this.getCartographicToPosition( nearEquatorLat, lonMid, heightEnd, _orthoZ );
			_orthoZ.z = 0;
			if ( _orthoZ.length() < 1e-10 ) {

				_orthoZ.set( 1, 0, 0 );

			} else {

				_orthoZ.normalize();

			}

			_orthoY.set( 0, 0, 1 );
			_orthoX.crossVectors( _orthoZ, _orthoY ).normalize();

			// construct the OBB frame
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );
			_invMatrix.copy( matrix ).invert();

			// x extents
			// find the furthest point rotated 90 degrees from the center of the region
			this.getCartographicToPosition( nearEquatorLat, lonMid + HALF_PI, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.x = Math.abs( _vec.x );
			min.x = - max.x;

			// y extents
			// measure the top of the region, accounting for the diagonal tilt of the edge
			this.getCartographicToPosition( latEnd, 0, allBelowEquator ? heightStart : heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.y = _vec.y;

			// measure the bottom of the region, accounting for the diagonal tilt of the edge
			this.getCartographicToPosition( latStart, 0, allAboveEquator ? heightStart : heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.y = _vec.y;

			// z extends
			// measure the furthest point at the center of the region
			this.getCartographicToPosition( nearEquatorLat, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.z = _vec.z;

			// measure the opposite end, which is guaranteed to be at the furthest extents since this lon region extents is > PI
			this.getCartographicToPosition( nearEquatorLat, lonEnd, heightEnd, _vec ).applyMatrix4( _invMatrix );
			min.z = _vec.z;

		}

		// center the frame
		box.getCenter( _vec );
		box.min.sub( _vec ).multiplyScalar( 1 + INFLATE_EPSILON );
		box.max.sub( _vec ).multiplyScalar( 1 + INFLATE_EPSILON );

		_vec.applyMatrix4( matrix );
		matrix.setPosition( _vec );

	}

	getBoundingSphere( sphere ) {

		if ( isTriaxial( this.radius ) ) {

			console.warn( 'EllipsoidRegion: Triaxial ellipsoids are not supported.' );

		}

		// TODO: this could be optimized or the OBB could be generated at the same time since
		// a lot of the the points are reused

		// use the OBB function to get a reasonable center
		this.getBoundingBox( _box, _matrix );
		sphere.center.setFromMatrixPosition( _matrix );
		sphere.radius = 0;

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const latMid = ( latStart + latEnd ) * 0.5;
		const lonMid = ( lonStart + lonEnd ) * 0.5;
		const allAboveEquator = latStart > 0.0;
		const allBelowEquator = latEnd < 0.0;

		let nearEquatorLat;
		if ( allAboveEquator ) {

			nearEquatorLat = latStart;

		} else if ( allBelowEquator ) {

			nearEquatorLat = latEnd;

		} else {

			nearEquatorLat = 0;

		}

		// lon start extremity
		this.getCartographicToPosition( nearEquatorLat, lonStart, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check corners and mid points for the top
		this.getCartographicToPosition( latEnd, lonStart, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		this.getCartographicToPosition( latEnd, lonMid, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check corners and mid points for the bottom
		this.getCartographicToPosition( latStart, lonStart, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		this.getCartographicToPosition( latStart, lonMid, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check center extremity
		this.getCartographicToPosition( latMid, lonMid, heightEnd, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check lower height extremity
		this.getCartographicToPosition( latStart, lonStart, heightStart, _vec );
		expandSphereRadiusSquared( _vec, sphere );

		// check 90 degree offset if range is larger than PI
		if ( lonEnd - lonStart > PI ) {

			this.getCartographicToPosition( nearEquatorLat, lonMid + PI, heightEnd, _vec );
			expandSphereRadiusSquared( _vec, sphere );

		}

		sphere.radius = Math.sqrt( sphere.radius ) * ( 1 + INFLATE_EPSILON );

	}

	intersectsRay( ray, target = new Vector3() ) {

		const scope = this;
		const { latStart, latEnd, lonStart, lonEnd, heightStart, heightEnd, radius } = this;

		// create scaling matrix to transform ellipsoid to unit sphere
		_scaleMatrix.makeScale( ...radius ).invert();
		_ray.copy( ray ).applyMatrix4( _scaleMatrix );

		let closestDistanceSq = Infinity;
		let foundIntersection = false;

		// test all boundary surfaces
		intersectCap( heightEnd );
		intersectCap( heightStart );
		intersectLatitudeSurface( latStart );
		intersectLatitudeSurface( latEnd );
		intersectLongitudeSurface( lonStart );
		intersectLongitudeSurface( lonEnd );

		return foundIntersection ? target : null;

		// intersects the flat regions formed by the height offsets
		function intersectCap( height ) {

			// TODO: this doesn't fully seem correct
			// intersect the scaled ray with a unit sphere at the given height
			const scaleFactor = 1.0 + height;

			// Ray-sphere intersection using quadratic formula
			// Sphere centered at origin with radius = scaleFactor
			const dirDotOrigin = _ray.direction.dot( _ray.origin );
			const originLengthSq = _ray.origin.lengthSq();
			const radiusSq = scaleFactor * scaleFactor;

			const discriminant = dirDotOrigin * dirDotOrigin - originLengthSq + radiusSq;
			if ( discriminant < 0 ) return;

			const sqrtDiscriminant = Math.sqrt( discriminant );
			const t1 = - dirDotOrigin - sqrtDiscriminant;
			const t2 = - dirDotOrigin + sqrtDiscriminant;

			// test both intersection points
			for ( const t of [ t1, t2 ] ) {

				if ( t < 0 ) continue;

				// get the intersection point in world space and extract the cartographic values
				_ray.at( t, _point ).multiply( radius );
				const { lat, lon } = scope.getPositionToCartographic( _point, _cartographic );

				// get longitude relative to the region
				let normalizedLon = normalizeLongitude( lon );

				// check if it's within the bounds
				const insideLon = normalizedLon >= lonStart && normalizedLon <= lonEnd;
				const insideLat = lat >= latStart && lat <= latEnd;
				if ( insideLon && insideLat ) {

					// calculate squared distance from ray origin to intersection point
					const distanceSq = _point.distanceToSquared( ray.origin );
					if ( distanceSq < closestDistanceSq ) {

						closestDistanceSq = distanceSq;
						target.copy( _point );
						foundIntersection = true;

					}

				}

			}

		}

		// Helper function to intersect with a latitude cone
		function intersectLatitudeSurface( lat ) {

			// A latitude line on an ellipsoid forms a cone around the Z-axis
			// For a unit sphere, the cone has half-angle = (PI/2 - lat)
			// On an ellipsoid, we work in scaled space where it's still a cone
			const sinLat = Math.sin( lat );

			if ( lat === 0 ) {

				// the equator is a plane
				_planeNormal.set( 0, 0, 1 );
				_plane.setFromNormalAndCoplanarPoint( _planeNormal, _vec.set( 0, 0, 0 ) );

				if ( _ray.intersectPlane( _plane, _point ) === null ) {

					return;

				}

				const t = _vec.copy( _point ).sub( _ray.origin ).dot( _ray.direction );
				if ( t < 0 ) {

					return;

				}

				// back to work space
				_point.multiply( radius );
				const { height, lon } = scope.getPositionToCartographic( _point, _cartographic );

				const normalizedLon = normalizeLongitude( lon );
				const insideHeight = height >= heightStart && height <= heightEnd;
				const insideLon = normalizedLon >= lonStart && normalizedLon <= lonEnd;
				if ( insideHeight && insideLon ) {

					// calculate squared distance from ray origin to intersection point
					const distanceSq = _point.distanceToSquared( ray.origin );
					if ( distanceSq < closestDistanceSq ) {

						closestDistanceSq = distanceSq;
						target.copy( _point );
						foundIntersection = true;

					}

				}

			} else {

				// Intersect with the latitude cone
				if ( intersectRayWithLatitudeCone( _ray, lat, _point ) === null ) {

					return;

				}

				// Get the intersection point in world space
				_point.multiply( radius );

				// Get the lat/lon positions
				const { lon, height } = scope.getPositionToCartographic( _point, _cartographic );

				// Verify we're on the correct side of the cone
				// (cone has two nappes, we only want one)
				const pointZ = _point.z / radius.z;
				const expectedZ = sinLat;
				if ( Math.sign( pointZ ) !== Math.sign( expectedZ ) ) {

					return;

				}

				const normalizedLon = normalizeLongitude( lon );
				const insideHeight = height >= heightStart && height <= heightEnd;
				const insideLon = normalizedLon >= lonStart && normalizedLon <= lonEnd;
				if ( insideHeight && insideLon ) {

					// calculate squared distance from ray origin to intersection point
					const distanceSq = _point.distanceToSquared( ray.origin );
					if ( distanceSq < closestDistanceSq ) {

						closestDistanceSq = distanceSq;
						target.copy( _point );
						foundIntersection = true;

					}

				}

			}

		}

		function intersectLongitudeSurface( surfaceLon ) {

			// construct a plane at the given longitude and find the intersection
			_planeNormal.set( - Math.sin( surfaceLon ), Math.cos( surfaceLon ), 0 );
			_plane.setFromNormalAndCoplanarPoint( _planeNormal, _vec.set( 0, 0, 0 ) );
			if ( _ray.intersectPlane( _plane, _point ) === null ) {

				return;

			}

			// get the distance to the point
			const t = _vec.copy( _point ).sub( _ray.origin ).dot( _ray.direction );
			if ( t < 0 ) {

				return;

			}

			// back to world space
			_point.multiply( radius );

			// get the lat/lon positions
			const { lat, lon, height } = scope.getPositionToCartographic( _point, _cartographic );
			const normalizedLon = normalizeLongitude( lon );
			const insideLon = normalizedLon >= lonStart && normalizedLon <= lonEnd;
			const insideLat = lat >= latStart && lat <= latEnd;
			const insideHeight = height >= heightStart && height <= heightEnd;

			if ( insideHeight && insideLat && insideLon ) {

				// calculate squared distance from ray origin to intersection point
				const distanceSq = _point.distanceToSquared( ray.origin );
				if ( distanceSq < closestDistanceSq ) {

					closestDistanceSq = distanceSq;
					target.copy( _point );
					foundIntersection = true;

				}

			}

		}

		function normalizeLongitude( lon ) {

			lon = ( lon - lonStart ) % ( 2 * PI );
			if ( lon < 0 ) lon += 2 * PI;
			lon += lonStart;

			return lon;

		}

	}

}
