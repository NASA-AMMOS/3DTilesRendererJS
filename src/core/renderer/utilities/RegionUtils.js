// Converts a 3D Tiles `region` bounding volume to an oriented `box` bounding volume, for renderers
// without region support of their own. This is the bounding box computation of the three.js
// `EllipsoidRegion` written on plain numbers, so it can be shared between renderers.

// bounds are lightly inflated to account for floating point error
const INFLATE_EPSILON = 1e-13;
const PI = Math.PI;
const HALF_PI = PI / 2;

const _normal = [ 0, 0, 0 ];
const _position = [ 0, 0, 0 ];
const _framePosition = [ 0, 0, 0 ];
const _orthoX = [ 0, 0, 0 ];
const _orthoY = [ 0, 0, 0 ];
const _orthoZ = [ 0, 0, 0 ];
const _min = [ 0, 0, 0 ];
const _max = [ 0, 0, 0 ];

function dot( a, b ) {

	return a[ 0 ] * b[ 0 ] + a[ 1 ] * b[ 1 ] + a[ 2 ] * b[ 2 ];

}

function cross( a, b, target ) {

	const x = a[ 1 ] * b[ 2 ] - a[ 2 ] * b[ 1 ];
	const y = a[ 2 ] * b[ 0 ] - a[ 0 ] * b[ 2 ];
	const z = a[ 0 ] * b[ 1 ] - a[ 1 ] * b[ 0 ];
	target[ 0 ] = x;
	target[ 1 ] = y;
	target[ 2 ] = z;
	return target;

}

function normalize( v ) {

	const length = Math.sqrt( dot( v, v ) );
	if ( length > 0 ) {

		v[ 0 ] /= length;
		v[ 1 ] /= length;
		v[ 2 ] /= length;

	}

	return v;

}

// the surface normal of the ellipsoid at the given latitude and longitude
function getCartographicToNormal( lat, lon, target ) {

	const cosLat = Math.cos( lat );
	target[ 0 ] = cosLat * Math.cos( lon );
	target[ 1 ] = cosLat * Math.sin( lon );
	target[ 2 ] = Math.sin( lat );
	return normalize( target );

}

// the position at the given latitude, longitude and height above the surface of the ellipsoid
function getCartographicToPosition( radii, lat, lon, height, target ) {

	// From Cesium function Ellipsoid.cartographicToCartesian
	// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/core/renderer/Ellipsoid.js#L396
	getCartographicToNormal( lat, lon, _normal );

	const x = _normal[ 0 ] * radii[ 0 ] ** 2;
	const y = _normal[ 1 ] * radii[ 1 ] ** 2;
	const z = _normal[ 2 ] * radii[ 2 ] ** 2;
	const gamma = Math.sqrt( _normal[ 0 ] * x + _normal[ 1 ] * y + _normal[ 2 ] * z );

	target[ 0 ] = x / gamma + _normal[ 0 ] * height;
	target[ 1 ] = y / gamma + _normal[ 1 ] * height;
	target[ 2 ] = z / gamma + _normal[ 2 ] * height;
	return target;

}

// the position at the given latitude, longitude and height, in the frame of the orthonormal axes
function getPositionInFrame( radii, lat, lon, height, target ) {

	getCartographicToPosition( radii, lat, lon, height, _position );
	target[ 0 ] = dot( _position, _orthoX );
	target[ 1 ] = dot( _position, _orthoY );
	target[ 2 ] = dot( _position, _orthoZ );
	return target;

}

/**
 * Computes an oriented box bounding a 3D Tiles `region` bounding volume, in the 12 number layout
 * of a `box` bounding volume: the center, followed by the half-length vectors of its x, y and z
 * axes. Like the region, the box is in the frame of the tileset, unaffected by tile transforms.
 * Only oblate spheroids, with equal x and y radii, are supported.
 * @param {Array<number>} region - The region, as [ west, south, east, north, minHeight, maxHeight ]
 * with the angles in radians and the heights in meters.
 * @param {Array<number>} radii - The x, y and z radii of the ellipsoid.
 * @param {Array<number>} [target] - The array the box is written to.
 * @returns {Array<number>} The box.
 * @ignore
 */
export function regionToBox( region, radii, target = new Array( 12 ) ) {

	if ( radii[ 0 ] !== radii[ 1 ] ) {

		console.warn( 'regionToBox: Triaxial ellipsoids are not supported.' );

	}

	const [ lonStart, latStart, lonEnd, latEnd, heightStart, heightEnd ] = region;

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
	const min = _min;
	const max = _max;
	const vec = _framePosition;
	if ( lonEnd - lonStart <= PI ) {

		// extract the axes
		getCartographicToNormal( latMid, lonMid, _orthoZ );
		_orthoY[ 0 ] = 0;
		_orthoY[ 1 ] = 0;
		_orthoY[ 2 ] = 1;
		normalize( cross( _orthoY, _orthoZ, _orthoX ) );
		normalize( cross( _orthoZ, _orthoX, _orthoY ) );

		// extract x
		// check the most bowing point near the equator relative to the frame
		getPositionInFrame( radii, nearEquatorLat, lonStart, heightEnd, vec );
		max[ 0 ] = Math.abs( vec[ 0 ] );
		min[ 0 ] = - max[ 0 ];

		// extract y
		// check corners and mid points for the top
		getPositionInFrame( radii, latEnd, lonStart, heightEnd, vec );
		max[ 1 ] = vec[ 1 ];

		getPositionInFrame( radii, latEnd, lonMid, heightEnd, vec );
		max[ 1 ] = Math.max( vec[ 1 ], max[ 1 ] );

		// check corners and mid points for the bottom
		getPositionInFrame( radii, latStart, lonStart, heightEnd, vec );
		min[ 1 ] = vec[ 1 ];

		getPositionInFrame( radii, latStart, lonMid, heightEnd, vec );
		min[ 1 ] = Math.min( vec[ 1 ], min[ 1 ] );

		// extract z
		// check center point
		getPositionInFrame( radii, latMid, lonMid, heightEnd, vec );
		max[ 2 ] = vec[ 2 ];

		// check top and bottom reverse points
		getPositionInFrame( radii, latStart, lonStart, heightStart, vec );
		min[ 2 ] = vec[ 2 ];

		getPositionInFrame( radii, latEnd, lonStart, heightStart, vec );
		min[ 2 ] = Math.min( vec[ 2 ], min[ 2 ] );

	} else {

		// extract a vector towards the middle of the region
		getCartographicToPosition( radii, nearEquatorLat, lonMid, heightEnd, _orthoZ );
		_orthoZ[ 2 ] = 0;
		if ( Math.sqrt( dot( _orthoZ, _orthoZ ) ) < 1e-10 ) {

			_orthoZ[ 0 ] = 1;
			_orthoZ[ 1 ] = 0;
			_orthoZ[ 2 ] = 0;

		} else {

			normalize( _orthoZ );

		}

		_orthoY[ 0 ] = 0;
		_orthoY[ 1 ] = 0;
		_orthoY[ 2 ] = 1;
		normalize( cross( _orthoZ, _orthoY, _orthoX ) );

		// x extents
		// find the furthest point rotated 90 degrees from the center of the region
		getPositionInFrame( radii, nearEquatorLat, lonMid + HALF_PI, heightEnd, vec );
		max[ 0 ] = Math.abs( vec[ 0 ] );
		min[ 0 ] = - max[ 0 ];

		// y extents
		// measure the top of the region, accounting for the diagonal tilt of the edge
		getPositionInFrame( radii, latEnd, 0, allBelowEquator ? heightStart : heightEnd, vec );
		max[ 1 ] = vec[ 1 ];

		// measure the bottom of the region, accounting for the diagonal tilt of the edge
		getPositionInFrame( radii, latStart, 0, allAboveEquator ? heightStart : heightEnd, vec );
		min[ 1 ] = vec[ 1 ];

		// z extents
		// measure the furthest point at the center of the region
		getPositionInFrame( radii, nearEquatorLat, lonMid, heightEnd, vec );
		max[ 2 ] = vec[ 2 ];

		// measure the opposite end, which is guaranteed to be at the furthest extents since this lon region extents is > PI
		getPositionInFrame( radii, nearEquatorLat, lonEnd, heightEnd, vec );
		min[ 2 ] = vec[ 2 ];

	}

	// the center of the box, from the frame to the tileset frame, and the half-length vectors of
	// its axes
	const axes = [ _orthoX, _orthoY, _orthoZ ];
	target[ 0 ] = 0;
	target[ 1 ] = 0;
	target[ 2 ] = 0;
	for ( let i = 0; i < 3; i ++ ) {

		const axis = axes[ i ];
		const center = ( min[ i ] + max[ i ] ) * 0.5;
		const halfLength = ( max[ i ] - min[ i ] ) * 0.5 * ( 1 + INFLATE_EPSILON );
		for ( let c = 0; c < 3; c ++ ) {

			target[ c ] += axis[ c ] * center;
			target[ 3 + i * 3 + c ] = axis[ c ] * halfLength;

		}

	}

	return target;

}
