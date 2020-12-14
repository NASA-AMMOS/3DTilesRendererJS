import {
	MathUtils,
	Vector3,
	LineSegments,
	BufferAttribute,
	BufferGeometry,
	LineBasicMaterial,
	Plane,
} from 'three';

export const WGS84_MAJOR_RADIUS = 10;// 6378137.0;
export const WGS84_MINOR_RADIUS = 5; //6356752.314245;
const PI = Math.PI;
const PI2 = PI * 2;
const PI_OVER_2 = PI / 2;
const _vecArray = new Array( 12 ).fill().map( () => new Vector3() );
const _vec = new Vector3();
const _vec2 = new Vector3();
const _vec3 = new Vector3();
const _vec4 = new Vector3();
const _zVec = new Vector3( 0, 1, 0 );
const _plane = new Plane();
const _surfaceNormal = new Vector3();
const _point = new Vector3();

function getRadiusFromLat( lat ) {

	lat -= PI_OVER_2;

	// https://math.stackexchange.com/questions/432902/how-to-get-the-radius-of-an-ellipse-at-a-specific-angle-by-knowing-its-semi-majo
	const r1 = WGS84_MAJOR_RADIUS;
	const r2 = WGS84_MINOR_RADIUS;
	const r12 = r1 * r1;
	const r22 = r2 * r2;
	const latSin = Math.sin( lat );
	const latCos = Math.cos( lat );
	const radius = r1 * r2 / Math.sqrt( r12 * latSin * latSin + r22 * latCos * latCos );

	return radius;
}

function latLonToSurfaceVector( lat, lon, target, height = 0 ) {

	target.setFromSphericalCoords( 1, lat, PI_OVER_2 );

	const radius = getRadiusFromLat( lat );
	target.multiplyScalar( radius );

	// TODO: WGS84 frame specifies Z as north pole
	// target.z = target.y;
	// target.y = 0;

	// TODO: is this rotating the right direction?
	target.applyAxisAngle( _zVec, lon );
	return target;

}

function vectorToLatitude( vector ) {

	return Math.acos( vector.y / vector.length() );

}

function vectorToLongitude( vector ) {

	return Math.atan2( vector.x, vector.z ) - PI_OVER_2;

}

export class WGS84Region {

	constructor( west, south, east, north, minHeight, maxHeight ) {

		// TODO: ensure north / south are positive

		// from west to east, south to north, min to max
		// TODO: update these values to be minimum ranges in the above directions maybe?
		this.east = 0;
		this.west = 0;

		this.south = 0;
		this.north = 0;

		this.minHeight = 0;
		this.maxHeight = 0;

		this.eastPlane = new Plane();
		this.westPlane = new Plane();
		this.northDirection = new Vector3();
		this.southDirection = new Vector3();
		this.cornerPoints = new Array( 8 ).fill().map( () => new Vector3() );
		this.set( west, south, east, north, minHeight, maxHeight );

	}

	set( west, south, east, north, minHeight, maxHeight ) {

		if ( west > east ) [ west, east ] = [ east, west ];
		if ( south > north ) [ north, south ] = [ south, north ];
		if ( minHeight > maxHeight ) [ maxHeight, minHeight ] = [ minHeight, maxHeight ];

		const latRange = north - south;
		const lonRange = east - west;

		if ( latRange > PI || lonRange > PI2 ) {

			throw new Error( 'WGS84Region: Latitude or Longitude out of range.' );

		}

		west = west % PI2;
		if ( west < 0 ) {

			west += PI2;

		}

		south = south % PI2;
		if ( south < 0 ) {

			south += PI2;

		}

		this.west = west;
		this.east = west + lonRange;

		this.south = south;
		this.north = south + latRange;

		this.minHeight = minHeight;
		this.maxHeight = maxHeight;
		this._updateCache();

	}

	getClosestPointToPoint( point, target ) {

		const {
			minHeight,
			maxHeight,
			north,
			south,
			east,
			west,
			northDirection,
			southDirection,
			eastPlane,
			westPlane,
			cornerPoints,
		} = this;

		// get the latitude and longitude adjusted to the
		// range of the region
		let lat = vectorToLatitude( point );
		lat -= south;
		lat %= PI2;
		lat += south;

		let lon = vectorToLongitude( point );
		lon -= west;
		lon %= PI2;
		if ( lon < 0 ) {

			lon += PI2;

		}
		lon += west;

		const aboveLon = lat > north;
		const belowLon = lat < south;

		const pointInLat = ! belowLon && ! aboveLon;
		const pointInLon = lon >= west && lon <= east;

		if ( pointInLon ) {

			if ( pointInLat ) {

				// if the point is within the latitude and longitude patch then just clamp
				// the length of the point to the min and max heights.
				const pointDistance = point.length();
				latLonToSurfaceVector( lat, lon, target );

				const surfaceDistance = target.length();
				const newDistance = MathUtils.clamp( pointDistance, surfaceDistance + minHeight, surfaceDistance + maxHeight );
				target
					.copy( point )
					.multiplyScalar( newDistance / pointDistance );

			} else {

				// if the point is in the longitude band but outside the latitude wedge then
				// clamp to the north and south planes beforehand.
				lat = MathUtils.clamp( lat, south, north );
				lon = MathUtils.clamp( lon, west, east );

				if ( aboveLon ) {

					_plane.constant = 0;
					_plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon );

				} else {

					_plane.constant = 0;
					_plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );

				}

				const surfaceDistance = latLonToSurfaceVector( lat, lon, _surfaceNormal ).length();
				_plane.projectPoint( point, target );

				const inverted = target.dot( _surfaceNormal ) < 0;
				const clampedLength = MathUtils.clamp(
					target.length() * ( inverted ? 0 : 1 ),
					surfaceDistance + minHeight,
					surfaceDistance + maxHeight
				);
				target.normalize().multiplyScalar( clampedLength );

				if ( inverted ) {

					target.multiplyScalar( - 1 );

				}

			}

		} else {

			// TODO: Remove use of _point and instead use point where
			// possible so we can remove extra copies
			_point.copy( point );

			if ( this._getLonRange() > PI ) {

				// project onto the closest plane
				if ( westPlane.distanceToPoint( _point ) < eastPlane.distanceToPoint( _point ) ) {

					westPlane.projectPoint( _point, target );
					lon = west;

				} else {

					eastPlane.projectPoint( _point, target );
					lon = east;

				}
				_point.copy( target );

				lat = MathUtils.clamp( lat, south, north );
				lon = MathUtils.clamp( lon, west, east );

				if ( pointInLat ) {

					const pointDistance = _point.length();
					latLonToSurfaceVector( lat, lon, target );

					const surfaceDistance = target.length();
					const newDistance = MathUtils.clamp( pointDistance, surfaceDistance + minHeight, surfaceDistance + maxHeight );
					target
						.copy( _point )
						.multiplyScalar( newDistance / pointDistance );

				} else {

					if ( aboveLon ) {

						_plane.constant = 0;
						_plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon );

					} else {

						_plane.constant = 0;
						_plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );

					}

					const surfaceDistance = latLonToSurfaceVector( lat, lon, _surfaceNormal ).length();
					_plane.projectPoint( _point, target );

					const inverted = target.dot( _surfaceNormal ) < 0;
					const clampedLength = MathUtils.clamp(
						target.length() * ( inverted ? 0 : 1 ),
						surfaceDistance + minHeight,
						surfaceDistance + maxHeight
					);
					target.normalize().multiplyScalar( clampedLength );

					if ( inverted ) {

						target.multiplyScalar( - 1 );

					}

				}

			} else {

				const westDist = westPlane.normal.dot( _point );
				const eastDist = eastPlane.normal.dot( _point );
				let insideWest = westDist < 0;
				let insideEast = eastDist < 0;

				let validProj = false;
				let projectedLon;

				if ( insideWest && ! insideEast ) {

					eastPlane.projectPoint( _point, target );
					validProj = westPlane.normal.dot( target ) < 0;
					projectedLon = east;

				}

				if ( insideEast && ! insideWest ) {

					westPlane.projectPoint( _point, target );
					validProj = eastPlane.normal.dot( target ) < 0;
					projectedLon = west;

				}

				if ( insideWest !== insideEast ) {

					_point.copy( target );

					lat = vectorToLatitude( _point );
					lat -= south;
					lat %= PI2;
					lat += south;

					lon = projectedLon;

					let useNorth = false;
					let useSouth = false;
					if ( validProj ) {

						useNorth = lat > north;
						useSouth = lat < south;

					} else {

						useSouth = lat < PI_OVER_2;
						useNorth = lat >= PI_OVER_2;

					}

					if ( useNorth ) {

						_plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon );
						_plane.projectPoint( _point, target );
						_point.copy( target );

					} else if ( useSouth ) {

						_plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );
						_plane.projectPoint( _point, target );
						_point.copy( target );

					}

					const regionAllAbove = north > PI_OVER_2 && south > PI_OVER_2;
					const regionAllBelow = north < PI_OVER_2 && south < PI_OVER_2;
					let inverted = false;

					lat = vectorToLatitude( target );
					lon = vectorToLongitude( target );

					const pointAbove = lat > PI_OVER_2;
					if ( regionAllAbove || regionAllBelow ) {

						inverted = pointAbove === regionAllBelow;

					} else {

						inverted = useSouth && target.y < 0 || useNorth && target.y > 0;

					}

					if ( inverted ) {

						target.multiplyScalar( - 1 );

					}

					const targetLength = target.length();
					const surfaceDistance = latLonToSurfaceVector( lat, lon, _surfaceNormal ).length();
					const clampedLength = MathUtils.clamp(
						targetLength * ( inverted ? 0 : 1 ),
						surfaceDistance + minHeight,
						surfaceDistance + maxHeight
					);
					target.multiplyScalar( clampedLength / targetLength );

				} else {

					// project onto the closest plane
					if ( westPlane.distanceToPoint( _point ) < eastPlane.distanceToPoint( _point ) ) {

						westPlane.projectPoint( _point, target );
						lon = east;

					} else {

						eastPlane.projectPoint( _point, target );
						lon = west;

					}

					latLonToSurfaceVector( north, lon, _vec2 );
					latLonToSurfaceVector( south, lon, _vec );

					if ( point.distanceToSquared( _vec ) < point.distanceToSquared( _vec2 ) ) {

						_vec2.copy( _vec );
						_plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );
						_plane.projectPoint( target, _vec );

					} else {

						_plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon );
						_plane.projectPoint( target, _vec );

					}

					let distance;
					if ( _vec.dot( _vec2 ) < 0 ) {

						distance = 0;

					} else {

						distance = _vec.length();

					}

					const surfaceDistance = _vec2.length();
					target
						.copy( _vec2 )
						.multiplyScalar(
							MathUtils.clamp( distance, surfaceDistance + minHeight, surfaceDistance + maxHeight ) / surfaceDistance,
						);

				}

			}

		}

		return target;

	}

	getPointAt( latLerp, lonLerp, heightLerp, target = new Vector3() ) {

		const lat = MathUtils.lerp( this.south, this.north, latLerp );
		const lon = MathUtils.lerp( this.west, this.east, lonLerp );
		const height = MathUtils.lerp( this.minHeight, this.maxHeight, heightLerp );

		latLonToSurfaceVector( lat, lon, target );

		const surfaceHeight = target.length();
		target.normalize().multiplyScalar( surfaceHeight + height );
		return target;

	}

	getBoundingSphere( sphere ) {

		const {
			east,
			west,
			north,
			south,
			minHeight,
			maxHeight,
		} = this;
		const center = sphere.center;
		let minX, maxX;
		let minY, maxY;
		let minZ, maxZ;

		// get y range
		this.getPointAt( 0, 0, 1, _vec );
		this.getPointAt( 0, 0, 0, _vec2 );
		this.getPointAt( 1, 0, 1, _vec3 );
		this.getPointAt( 1, 0, 0, _vec4 );
		minY = Math.min( _vec.y, _vec2.y, _vec3.y, _vec4.y );
		maxY = Math.max( _vec.y, _vec2.y, _vec3.y, _vec4.y );
		_vecArray.forEach( v => v.copy( _vec ) );
		_vecArray[ 0 ].copy( _vec );
		_vecArray[ 1 ].copy( _vec2 );
		_vecArray[ 2 ].copy( _vec3 );
		_vecArray[ 3 ].copy( _vec4 );

		let maxLat;
		if ( ( north - PI_OVER_2 < 0 ) !== ( south - PI_OVER_2 < 0 ) ) {

			maxLat = PI / 2;

		} else {

			maxLat = Math.max( north, south );

		}

		let maxLon = Math.min( PI, this._getLonRange() );

		// get x range
		latLonToSurfaceVector( maxLat, 0, _vec, maxHeight );
		latLonToSurfaceVector( maxLat, this._getLonRange() / 2, _vec2, maxHeight );
		latLonToSurfaceVector( Math.min( south, north ), this._getLonRange() / 2, _vec3, minHeight );
		minX = Math.min( _vec.x, _vec2.x, _vec3.x );
		maxX = Math.max( _vec.x, _vec2.x, _vec3.x );
		_vecArray[ 4 ].copy( _vec );
		_vecArray[ 5 ].copy( _vec2 );
		_vecArray[ 6 ].copy( _vec3 );

		// get z range
		latLonToSurfaceVector( maxLat, maxLon / 2, _vec, maxHeight );
		maxZ = _vec.z;
		minZ = - _vec.z;
		_vecArray[ 7 ].copy( _vec );

		center.x = ( minX + maxX ) / 2;
		center.y = ( minY + maxY ) / 2;
		center.z = ( minZ + maxZ ) / 2;

		const halfLon = MathUtils.lerp( west, east, 0.5 );
		center.applyAxisAngle( _zVec, halfLon );

		// TODO: ideally we'd center the point on whatever axis is longest so the sphere is minimal.
		sphere.setFromPoints( _vecArray, center );

	}

	distanceToPoint( point ) {

		this.getClosestPointToPoint( point, _vec );
		return point.distanceTo( _vec );

	}

	// Private
	_updateCache() {

		const {
			eastPlane,
			westPlane,
			northDirection,
			southDirection,
			cornerPoints,
		} = this;

		// west plane
		this.getPointAt( 0, 0, 1, _vec ); // south west max corner
		this.getPointAt( 0, 0, 0, _vec2 ); // south west min corner
		this.getPointAt( 1, 0, 1, _vec3 ); // north west max corner

		_vec2.sub( _vec ).normalize(); // south west inward vector
		_vec3.sub( _vec ).normalize(); // max west northward vector
		_vec3.cross( _vec2 );

		_vec3.multiplyScalar( - 1 );
		_vec3.normalize();
		westPlane.setFromNormalAndCoplanarPoint( _vec3, _vec );

		// east plane
		this.getPointAt( 0, 1, 1, _vec ); // south east max corner
		this.getPointAt( 0, 1, 0, _vec2 ); // south east min corner
		this.getPointAt( 1, 1, 1, _vec3 ); // north east max corner

		_vec2.sub( _vec ).normalize(); // south east inward vector
		_vec3.sub( _vec ).normalize(); // max east northward vector
		_vec3.cross( _vec2 );

		_vec3.normalize();
		eastPlane.setFromNormalAndCoplanarPoint( _vec3, _vec );

		const surfaceNormal = new Vector3();
		const tangent = new Vector3();

		// get south direction
		this.getPointAt( 0, 0, 1, surfaceNormal );
		surfaceNormal.normalize();

		tangent.copy( surfaceNormal );
		tangent.y = 0;
		[ tangent.x, tangent.z ] = [ tangent.z, tangent.x ];
		tangent.x *= - 1;
		tangent.normalize();

		if ( Math.abs( surfaceNormal.y ) === 1 ) {

			southDirection.set( 1, 0, 0 );

		} else {

			southDirection.crossVectors( surfaceNormal, tangent );

		}

		// get north direction
		this.getPointAt( 1, 0, 1, surfaceNormal );
		surfaceNormal.normalize();

		tangent.copy( surfaceNormal );
		tangent.y = 0;
		[ tangent.x, tangent.z ] = [ tangent.z, tangent.x ];
		tangent.x *= - 1;
		tangent.normalize();

		if ( Math.abs( surfaceNormal.y ) === 1 ) {

			northDirection.set( 1, 0, 0 );

		} else {

			northDirection.crossVectors( surfaceNormal, tangent );

		}

		// Get the corner points
		this._getCornerPoints( cornerPoints );

	}

	_getLatRange() {

		return this.north - this.south;

	}

	_getLonRange() {

		return this.east - this.west;

	}

	_getCornerPoints( target ) {

		let curr = 0;
		for ( let y = 0; y <= 1; y ++ ) {

			for ( let x = 0; x <= 1; x ++ ) {

				for ( let h = 0; h <= 1; h ++ ) {

					this.getPointAt( x, y, h, target[ curr ] );
					curr ++;

				}

			}

		}

	}

	_getPrimaryPoints( target ) {

		this._getCornerPoints( target );

		this.getPointAt( 0, 0.5, 0, target[ 8 ] );
		this.getPointAt( 0, 0.5, 1, target[ 9 ] );
		this.getPointAt( 1, 0.5, 0, target[ 10 ] );
		this.getPointAt( 1, 0.5, 1, target[ 11 ] );

	}

	_isPointInLatLon( point ) {

		let lat = vectorToLatitude( point );
		let lon = vectorToLongitude( point );

		lat -= this.south;
		lat %= PI2;
		lat += this.south;

		lon -= this.west;
		lon %= PI2;
		if ( lon < 0 ) {

			lon += PI2;

		}
		lon += this.west;

		return lat > this.south && lat < this.north && lon > this.west && lon < this.east;

	}

}

export class WGS84RegionHelper extends LineSegments {

	constructor( region, color = 0xffff00 ) {

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ 0, 0, 0, 0, 0, 0 ] ), 3 ) );

		super( geometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );
		this.region = region;
		this.update();

	}

	update() {

		const region = this.region;
		const latSteps = Math.max( 10, Math.floor( region._getLatRange() / 0.1 ) );
		const lonSteps = Math.max( 10, Math.floor( region._getLonRange() / 0.1 ) );

		const latNorthMinPosition = [];
		const latNorthMaxPosition = [];
		const latSouthMinPosition = [];
		const latSouthMaxPosition = [];

		// lat lines
		for ( let i = 0; i <= latSteps; i ++ ) {

			const addTwo = i !== 0 && i !== latSteps;
			region.getPointAt( i / latSteps, 0, 0, _vec );
			latNorthMinPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) latNorthMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( i / latSteps, 0, 1, _vec );
			latNorthMaxPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) latNorthMaxPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( i / latSteps, 1, 0, _vec );
			latSouthMinPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) latSouthMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( i / latSteps, 1, 1, _vec );
			latSouthMaxPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) latSouthMaxPosition.push( _vec.x, _vec.y, _vec.z );

		}

		const lonEastMinPosition = [];
		const lonEastMaxPosition = [];
		const lonWestMinPosition = [];
		const lonWestMaxPosition = [];

		// lon lines
		for ( let i = 0; i <= lonSteps; i ++ ) {

			const addTwo = i !== 0 && i !== lonSteps;
			region.getPointAt( 0, i / lonSteps, 0, _vec );
			lonEastMinPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) lonEastMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( 0, i / lonSteps, 1, _vec );
			lonEastMaxPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) lonEastMaxPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( 1, i / lonSteps, 0, _vec );
			lonWestMinPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) lonWestMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( 1, i / lonSteps, 1, _vec );
			lonWestMaxPosition.push( _vec.x, _vec.y, _vec.z );
			if ( addTwo ) lonWestMaxPosition.push( _vec.x, _vec.y, _vec.z );

		}

		const heightPosition = [];

		// corner lines
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				region.getPointAt( x, y, 0, _vec );
				heightPosition.push( _vec.x, _vec.y, _vec.z );

				region.getPointAt( x, y, 1, _vec );
				heightPosition.push( _vec.x, _vec.y, _vec.z );

			}

		}

		const positions = new Float32Array( [
			...latNorthMinPosition,
			...latNorthMaxPosition,
			...latSouthMinPosition,
			...latSouthMaxPosition,
			...lonEastMinPosition,
			...lonEastMaxPosition,
			...lonWestMinPosition,
			...lonWestMaxPosition,
			...heightPosition,
		] );

		this.geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );

	}

}
