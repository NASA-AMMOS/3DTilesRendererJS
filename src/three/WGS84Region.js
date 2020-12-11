import { MathUtils, Vector3, LineSegments } from 'three';

const WGS84_MAJOR_RADIUS = 6378137.0;
const WGS84_MINOR_RADIUS = 6356752.314245;
const _vecArray = new Array( 10 ).fill().map( () => new Vector3() );

function latLonToSurfaceVector( lat, lon, target ) {

}

function vectorToLatLon( vector, target ) {

}

export class WGS84Region {

	constructor( west, south, east, north, minHeight, maxHeight ) {
		// from east to west, north to south, min to max
		// TODO: update these values to be minimum ranges in the above directions
		this.east = east;
		this.west = west;

		this.south = south;
		this.north = north;

		this.minHeight = minHeight;
		this.maxHeight = maxHeight;
	}

	getLatRange() {

		return this.south - this.north;

	}

	getLonRange() {

		return this.west - this.east;

	}

	getPointAt( latLerp, lonLerp, heightLerp, target ) {

		const lat = MathUtils.lerp( this.east, this.west, latLerp );
		const lon = MathUtils.lerp( this.north, this.south, lonLerp );
		const height = MathUtils.lerp( this.minHeight, this.maxHeight, heightLerp );

		latLonToSurfaceVector( lat, lon, target );

		const surfaceHeight = target.length();
		target.normalize().multiplyScalar( surfaceHeight + height );
		return target;

	}

	getPrimaryPoints( target ) {

		let curr = 0;
		for ( let x = 0; x <= 1; x ++ ) {

			for ( let y = 0; y <= 1; y ++ ) {

				for ( let h = 0; h <= 1; h ++ ) {

					this.getPointAt( x, y, h, target[ curr ] );
					curr ++;

				}

			}

		}

		this.getPointAt( 0.5, 0.5, 0, target[ curr ] );
		this.getPointAt( 0.5, 0.5, 1, target[ curr + 1 ] );

	}

	getObb( box, matrix ) {

		// Get the axis dictated by the center axis and up (or right if pointing up)

		this.getPrimaryPoints( _vecArray );
		for ( let i = 0, l = _vecArray.length; i < l; i ++ ) {

			// transform vector to local values
			box.expandByPoint( _vecArray[ i ] );

		}

	}

	distanceToPoint( point ) {

		// TODO: distance to point

		// return 0 if inside of planes

		// Get closest distance to planes this point is on the positive side of
		// Clamp shift target point to be within closest distance of the other two planes
		// Clamp distance to be within the min and max height

	}

}

export class WGS84RegionHelper extends LineSegments {

	constructor( region, color = 0xffff00 ) {

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ 0, 0, 0, 0, 0, 0 ] ), 3 ) );

		super ( geometry, new LineBasicMaterial( { color: color, toneMapped: false } ) );
		this.region = region;
		this.update();

	}

	update() {

		const region = this.region;
		const latSteps = Math.floor( region.getLatRange() / 0.1 );
		const lonSteps = Math.floor( region.getLonRange() / 0.1 );

		const latNorthMinPosition = [];
		const latNorthMaxPosition = [];
		const latSouthMinPosition = [];
		const latSouthMaxPosition = [];

		// lat lines
		for ( let i = 0; i <= latSteps; i ++ ) {

			region.getPointAt( i / latSteps, 0, 0, _vec );
			latNorthMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( i / latSteps, 0, 1, _vec );
			latNorthMaxPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( i / latSteps, 1, 0, _vec );
			latSouthMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( i / latSteps, 1, 1, _vec );
			latSouthMaxPosition.push( _vec.x, _vec.y, _vec.z );

		}

		const lonEastMinPosition = [];
		const lonEastMaxPosition = [];
		const lonWestMinPosition = [];
		const lonWestMaxPosition = [];

		// lon lines
		for ( let i = 0; i <= lonSteps; i ++ ) {

			region.getPointAt( 0, i / lonSteps, 0, _vec );
			lonEastMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( 0, i / lonSteps, 1, _vec );
			lonEastMaxPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( 1, i / lonSteps, 0, _vec );
			lonWestMinPosition.push( _vec.x, _vec.y, _vec.z );

			region.getPointAt( 1, i / lonSteps, 1, _vec );
			lonWestMaxPosition.push( _vec.x, _vec.y, _vec.z );

		}

		const heightPosition = [];

		// corner lines
		for ( let x = 0; x <= 1 ; x ++ ) {

			for ( let y = 0; y <= 1 ; y ++ ) {

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
