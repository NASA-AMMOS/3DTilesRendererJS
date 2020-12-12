import {
	MathUtils,
	Vector3,
	LineSegments,
	BufferAttribute,
	BufferGeometry,
	LineBasicMaterial,
	Plane,
} from 'three';

const WGS84_MAJOR_RADIUS = 10;// 6378137.0;
const WGS84_MINOR_RADIUS = 10; //6356752.314245;
const _vecArray = new Array( 12 ).fill().map( () => new Vector3() );
const _vec = new Vector3();
const _vec2 = new Vector3();
const _vec3 = new Vector3();
const _zVec = new Vector3( 0, 1, 0 );

function clampLat( lat, min, max ) {

	lat -= min;
	lat %= 2 * Math.PI;
	lat += min;
	return MathUtils.clamp( lat, min, max );

}

function clampLon( lon, min, max ) {

	lon -= min;
	lon %= 2 * Math.PI;
	if ( lon < - Math.PI ) {

		lon += 2 * Math.PI;

	}
	lon += min;

	return MathUtils.clamp( lon, min, max );

}

function toSmallestRot( angle ) {

	angle = angle % ( 2 * Math.PI );
	if ( angle < - Math.PI ) {

		return angle + 2 * Math.PI;

	} else if ( angle > Math.PI ) {

		return 2 * Math.PI - angle;

	} else {

		return angle;

	}

}

function latLonToSurfaceVector( lat, lon, target ) {

	target.setFromSphericalCoords( 1, lat, Math.PI / 2 );
	target.x *= WGS84_MAJOR_RADIUS;
	target.y *= WGS84_MINOR_RADIUS;

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

	return Math.atan2( vector.x, vector.z ) - Math.PI / 2;

}

export class WGS84Region {

	constructor( west, south, east, north, minHeight, maxHeight ) {

		if ( west > east || south > north ) throw new Error();

		// TODO: ensure north / south are positive

		// from west to east, south to north, min to max
		// TODO: update these values to be minimum ranges in the above directions maybe?
		this.east = east;
		this.west = west;

		this.south = south;
		this.north = north;

		this.minHeight = minHeight;
		this.maxHeight = maxHeight;

		this.eastPlane = new Plane();
		this.westPlane = new Plane();
		this.northDirection = new Vector3();
		this.southDirection = new Vector3();
		this.cornerPoints = new Array( 8 ).fill().map( () => new Vector3() );
		this._updateCache();

	}

	getClosestPointToPoint( point, target ) {

		point = new Vector3().copy( point );

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

		let lat = vectorToLatitude( point );
		lat -= south;
		lat %= 2 * Math.PI;
		lat += south;

		let lon = vectorToLongitude( point );
		lon -= west;
		lon %= 2 * Math.PI;
		if ( lon < 0 ) {

			lon += 2 * Math.PI;

		}
		lon += west;

		const aboveLon = lat > north;
		const belowLon = lat < south;

		const pointInLat = ! belowLon && ! aboveLon;
		const pointInLon = lon > west && lon < east;

		if ( pointInLon ) {

			if ( pointInLat ) {

				const pointDistance = point.length();
				latLonToSurfaceVector( lat, lon, target );

				const surfaceDistance = target.length();
				const newDistance = MathUtils.clamp( pointDistance, surfaceDistance + minHeight, surfaceDistance + maxHeight );
				target
					.copy( point )
					.multiplyScalar( newDistance / pointDistance );

			} else {

				lat = MathUtils.clamp( lat, south, north );
				lon = MathUtils.clamp( lon, west, east );

				const plane = new Plane();
				if ( aboveLon ) {

					plane.constant = 0;
					plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon )

				} else {

					plane.constant = 0;
					plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );

				}

				const surfaceNormal = new Vector3();
				const surfaceDistance = latLonToSurfaceVector( lat, lon, surfaceNormal ).length();
				plane.projectPoint( point, target );

				const inverted = target.dot( surfaceNormal ) < 0;
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

			if ( this.getLonRange() > Math.PI ) {

				if ( westPlane.distanceToPoint( point ) < eastPlane.distanceToPoint( point ) ) {

					westPlane.projectPoint( point, target );
					lon = west;

				} else {

					eastPlane.projectPoint( point, target );
					lon = east;

				}
				point.copy( target );

				lat = MathUtils.clamp( lat, south, north );
				lon = MathUtils.clamp( lon, west, east );

				if ( pointInLat ) {

					const pointDistance = point.length();
					latLonToSurfaceVector( lat, lon, target );

					const surfaceDistance = target.length();
					const newDistance = MathUtils.clamp( pointDistance, surfaceDistance + minHeight, surfaceDistance + maxHeight );
					target
						.copy( point )
						.multiplyScalar( newDistance / pointDistance );

				} else {

					const plane = new Plane();
					if ( aboveLon ) {

						plane.constant = 0;
						plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon )

					} else {

						plane.constant = 0;
						plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );

					}

					const surfaceNormal = new Vector3();
					const surfaceDistance = latLonToSurfaceVector( lat, lon, surfaceNormal ).length();
					plane.projectPoint( point, target );

					const inverted = target.dot( surfaceNormal ) < 0;
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

				const westDist = westPlane.normal.dot( point );
				const eastDist = eastPlane.normal.dot( point );
				let insideWest = westDist < 0;
				let insideEast = eastDist < 0;

				let validProj = false;
				let projectedLon;

				if ( insideWest && ! insideEast ) {

					eastPlane.projectPoint( point, target );
					validProj = westPlane.normal.dot( target ) < 0;
					projectedLon = east;

				}

				if ( insideEast && ! insideWest ) {

					westPlane.projectPoint( point, target );
					validProj = eastPlane.normal.dot( target ) < 0;
					projectedLon = west;

				}

				if ( insideWest !== insideEast ) {

					point.copy( target );

					lat = vectorToLatitude( point );
					lat -= south;
					lat %= 2 * Math.PI;
					lat += south;

					lon = projectedLon;

					let useNorth = false;
					let useSouth = false;
					if ( validProj ) {

						useNorth = lat > north;
						useSouth = lat < south;

					} else {

						useSouth = lat < Math.PI / 2;
						useNorth = lat >= Math.PI / 2;

					}

					if ( useNorth ) {

						const plane = new Plane();
						plane.normal.copy( northDirection ).applyAxisAngle( _zVec, lon );
						plane.projectPoint( point, target );
						point.copy( target );

					} else if ( useSouth ) {

						const plane = new Plane();
						plane.normal.copy( southDirection ).applyAxisAngle( _zVec, lon );
						plane.projectPoint( point, target );
						point.copy( target );

					}

					const regionAllAbove = north > Math.PI / 2 && south > Math.PI / 2;
					const regionAllBelow = north < Math.PI / 2 && south < Math.PI / 2;
					let inverted = false;

					lat = vectorToLatitude( target );
					lon = vectorToLongitude( target );

					const pointAbove = lat > Math.PI / 2;
					if ( regionAllAbove || regionAllBelow ) {

						inverted = pointAbove === regionAllBelow;

					} else {

						inverted = pointAbove === useSouth;

					}

					if ( inverted ) {

						target.multiplyScalar( - 1 );

					}

					const surfaceNormal = new Vector3();
					const surfaceDistance = latLonToSurfaceVector( lat, lon, surfaceNormal ).length();
					const clampedLength = MathUtils.clamp(
						target.length() * ( inverted ? 0 : 1 ),
						surfaceDistance + minHeight,
						surfaceDistance + maxHeight
					);
					target.normalize().multiplyScalar( clampedLength );

				} else {

					let closestDistSq = Infinity;
					let closestPt = null;
					for ( let i = 0, l = cornerPoints.length; i < l; i ++ ) {

						const p = cornerPoints[ i ];
						const sqDist = p.distanceToSquared( point );

						if ( sqDist	< closestDistSq ) {

							closestDistSq = sqDist;
							closestPt = p;

						}

					}

					target.copy( closestPt );

				}

			}

		}

	}

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

		if ( surfaceNormal.dot( tangent ) === 1 ) {

			southDirection.copy( surfaceNormal );

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

		if ( surfaceNormal.dot( tangent ) === 1 ) {

			northDirection.copy( surfaceNormal );

		} else {

			northDirection.crossVectors( surfaceNormal, tangent );

		}

		// Get the corner points
		this.getCornerPoints( cornerPoints );

	}

	getLatRange() {

		return this.north - this.south;

	}

	getLonRange() {

		return this.east - this.west;

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

	getCornerPoints( target ) {

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

	getBoundingSphere( sphere ) {

		// TODO: generate a more precise bounding sphere
		this.getPrimaryPoints( _vecArray );
		sphere.setFromPoints( _vecArray );

		if ( this.getLonRange() > Math.PI ) {

			sphere.radius = WGS84_MAJOR_RADIUS;

		}

	}

	getPrimaryPoints( target ) {

		this.getCornerPoints( target );

		this.getPointAt( 0, 0.5, 0, target[ 8 ] );
		this.getPointAt( 0, 0.5, 1, target[ 9 ] );
		this.getPointAt( 1, 0.5, 0, target[ 10 ] );
		this.getPointAt( 1, 0.5, 1, target[ 11 ] );

	}

	isPointInLatLon( point ) {

		let lat = vectorToLatitude( point );
		let lon = vectorToLongitude( point );

		lat -= this.south;
		lat %= 2 * Math.PI;
		lat += this.south;

		lon -= this.west;
		lon %= 2 * Math.PI;
		if ( lon < 0 ) {

			lon += 2 * Math.PI;

		}
		lon += this.west;

		return lat > this.south && lat < this.north && lon > this.west && lon < this.east;

	}

	distanceToPoint( point ) {

		this.getClosestPointToPoint( point, _vec );
		return point.distanceTo( _vec );

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
		const latSteps = Math.max( 10, Math.floor( region.getLatRange() / 0.1 ) );
		const lonSteps = Math.max( 10, Math.floor( region.getLonRange() / 0.1 ) );

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
