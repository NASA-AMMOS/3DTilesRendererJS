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

	// console.log(' ANGLE', angle)

	angle = angle % ( 2 * Math.PI );
	if ( angle < - Math.PI ) {

		return angle + 2 * Math.PI;

	} else if ( angle > Math.PI ) {

		return 2 * Math.PI - angle;

	} else {

		return angle;

	}

	return angle > Math.PI ? ( 2 * Math.PI ) - angle : angle;

}

function latLonToSurfaceVector( lat, lon, target ) {

	target.setFromSphericalCoords( 1, lat, Math.PI / 2 );
	target.x *= WGS84_MAJOR_RADIUS;
	target.y *= WGS84_MINOR_RADIUS;

	// WGS84 frame specifies Z as north pole
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

		this.planes = [];
		this._updatePlanes();

	}

	_updatePlanes() {

		// west plane
		this.getPointAt( 0, 0, 1, _vec ); // south west max corner
		this.getPointAt( 0, 0, 0, _vec2 ); // south west min corner
		this.getPointAt( 1, 0, 1, _vec3 ); // north west max corner

		_vec2.sub( _vec ).normalize(); // south west inward vector
		_vec3.sub( _vec ).normalize(); // max west northward vector
		_vec3.cross( _vec2 );

		const westPlane = new Plane();
		_vec3.multiplyScalar( - 1 );
		_vec3.normalize();
		westPlane.setFromNormalAndCoplanarPoint( _vec3, _vec );
		this.planes.push( westPlane );

		// east plane
		this.getPointAt( 0, 1, 1, _vec ); // south east max corner
		this.getPointAt( 0, 1, 0, _vec2 ); // south east min corner
		this.getPointAt( 1, 1, 1, _vec3 ); // north east max corner

		_vec2.sub( _vec ).normalize(); // south east inward vector
		_vec3.sub( _vec ).normalize(); // max east northward vector
		_vec3.cross( _vec2 );

		const eastPlane = new Plane();
		_vec3.normalize();
		eastPlane.setFromNormalAndCoplanarPoint( _vec3, _vec );
		this.planes.push( eastPlane );

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

	getBoundingBox( box ) {

		this.getPrimaryPoints( _vecArray );
		box.setFromPoints( _vecArray );
		// TODO: handle larger than PI lon

	}

	getBoundingSphere( sphere ) {

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
		lat = MathUtils.clamp( lat, this.south, this.north );

		lon -= this.west;
		lon %= 2 * Math.PI;
		if ( lon < 0 ) {

			lon += 2 * Math.PI;

		}
		lon += this.west;

		return lat > this.south && lat < this.north && lon > this.west && lon < this.east;

	}

	getClosestPointToPoint( point, target ) {

		if ( this.isPointInLatLon( point ) ) {

			const lat = vectorToLatitude( point );
			const lon = vectorToLongitude( point );

			const pointLength = point.length();
			latLonToSurfaceVector( lat, lon, target );

			const surfaceLength = target.length();
			target
				.copy( point )
				.normalize()
				.multiplyScalar(
					MathUtils.clamp( pointLength, surfaceLength + this.minHeight, surfaceLength + this.maxHeight ),
				);

			return;

		}

		const [ westPlane, eastPlane ] = this.planes;
		const westDist = westPlane.normal.dot( point );
		const eastDist = eastPlane.normal.dot( point );
		let insideWest = westDist < 0;
		let insideEast = eastDist < 0;

		const _point = new Vector3();
		_point.copy( point );
		point = _point;

		const lonGreaterThanPi = westPlane.normal.dot( eastPlane.normal ) > 0;
		if ( lonGreaterThanPi && ( insideWest || insideEast ) ) {

			insideEast = true;
			insideWest = true;

		}
		if ( insideWest && ! insideEast ) {

			eastPlane.projectPoint( point, target );
			insideEast = westPlane.normal.dot( target ) < 0;
			if ( insideEast ) {

				point.copy( target );

			}

		}

		if ( insideEast && ! insideWest ) {

			westPlane.projectPoint( point, target );
			insideWest = eastPlane.normal.dot( target ) < 0;
			if ( insideWest ) {

				point.copy( target );

			}

		}

		const l2 = vectorToLatitude( point );
		const oppositeHemisphere =
			( this.north < Math.PI / 2 && l2 > Math.PI / 2 ) ||
			( this.south > Math.PI / 2 && l2 < Math.PI / 2 );

		if ( insideEast && insideWest ) {

			const lat = clampLat( vectorToLatitude( point ), this.south, this.north );
			const lon = clampLon( vectorToLongitude( point ), this.west, this.east );

			const surfaceNormal = new Vector3();
			latLonToSurfaceVector( lat, lon, surfaceNormal );

			const surfaceDistance = surfaceNormal.length();

			const delta = new Vector3();
			delta.copy( surfaceNormal );
			delta.y = 0;
			[ delta.x, delta.z ] = [ delta.z, delta.x ];
			delta.x *= - 1;

			const cross = new Vector3();
			delta.normalize();
			surfaceNormal.normalize();
			cross.crossVectors( surfaceNormal, delta );


			const plane = new Plane();
			surfaceNormal.multiplyScalar( surfaceDistance );
			plane.setFromNormalAndCoplanarPoint( cross, surfaceNormal );
			plane.projectPoint( point, target );

			const targetLength = target.length();
			const inverted = Math.sign( target.dot( surfaceNormal ) ) < 0;

			target
				.normalize()
				.multiplyScalar(
					MathUtils.clamp( targetLength * ( inverted ? 0 : 1 ), surfaceDistance + this.minHeight, surfaceDistance + this.maxHeight ) * ( inverted ? - 1 : 1 ),
				);

			return;

		} else if ( ( ! insideWest || ! insideEast ) && ! lonGreaterThanPi || oppositeHemisphere ) {

			const points = new Array( 8 ).fill().map( () => new Vector3() );
			this.getCornerPoints( points );
			let closestDistSq = Infinity;
			let closestPt = null;
			for ( let i = 0, l = points.length; i < l; i ++ ) {

				const p = points[ i ];
				const sqDist = p.distanceToSquared( point );

				if ( sqDist	< closestDistSq ) {

					closestDistSq = sqDist;
					closestPt = p;

				}

			}
			target.copy( closestPt );
			return target;

		}
















		if ( insideEast && insideWest ) {

			target.copy( point );

		} else if ( Math.abs( westDist ) < Math.abs( eastDist ) ) {

			westPlane.projectPoint( point, target );

		} else {

			eastPlane.projectPoint( point, target );

		}


		let lat = vectorToLatitude( target );
		let lon = vectorToLongitude( target );

		lat -= this.south;
		lat %= 2 * Math.PI;
		lat += this.south;
		lat = MathUtils.clamp( lat, this.south, this.north );

		lon -= this.west;
		lon %= 2 * Math.PI;
		if ( lon < - Math.PI ) {

			lon += 2 * Math.PI;

		}
		lon += this.west;

		if ( lon < this.west || lon > this.east ) {

			if ( Math.abs( toSmallestRot( lon - this.west ) ) < Math.abs( toSmallestRot( lon - this.east ) ) ) {

				lon = this.west;

			} else {

				lon = this.east;

			}

		}


		const ogLength = target.length();
		latLonToSurfaceVector( lat, lon, target );

		const surfaceDistance = target.length();
		const length = MathUtils.clamp( ogLength, surfaceDistance + this.minHeight, surfaceDistance + this.maxHeight );
		target.multiplyScalar( length / surfaceDistance );

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
