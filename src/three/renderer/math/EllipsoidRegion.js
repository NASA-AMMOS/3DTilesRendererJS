import { MathUtils, Matrix4 } from 'three';
import { Vector3 } from 'three';
import { Ellipsoid } from './Ellipsoid.js';

const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = new Vector3();
const _orthoY = new Vector3();
const _orthoZ = new Vector3();
const _vec = new Vector3();
const _invMatrix = new Matrix4();

let _poolIndex = 0;
const _pointsPool = [];
function getVector( usePool = false ) {

	if ( ! usePool ) {

		return new Vector3();

	}

	if ( ! _pointsPool[ _poolIndex ] ) {

		_pointsPool[ _poolIndex ] = new Vector3();

	}

	_poolIndex ++;
	return _pointsPool[ _poolIndex - 1 ];

}

function resetPool() {

	_poolIndex = 0;

}

export class EllipsoidRegion extends Ellipsoid {

	constructor(
		x, y, z,
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

	_getPoints( usePool = false ) {

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const midLat = MathUtils.mapLinear( 0.5, 0, 1, latStart, latEnd );
		const midLon = MathUtils.mapLinear( 0.5, 0, 1, lonStart, lonEnd );

		const lonOffset = Math.floor( lonStart / HALF_PI ) * HALF_PI;
		const latlon = [
			[ - PI / 2, 0 ],
			[ PI / 2, 0 ],
			[ 0, lonOffset ],
			[ 0, lonOffset + PI / 2 ],
			[ 0, lonOffset + PI ],
			[ 0, lonOffset + 3 * PI / 2 ],

			[ latStart, lonEnd ],
			[ latEnd, lonEnd ],
			[ latStart, lonStart ],
			[ latEnd, lonStart ],

			[ 0, lonStart ],
			[ 0, lonEnd ],

			[ midLat, midLon ],
			[ latStart, midLon ],
			[ latEnd, midLon ],
			[ midLat, lonStart ],
			[ midLat, lonEnd ],

		];

		const target = [];
		const total = latlon.length;

		for ( let z = 0; z <= 1; z ++ ) {

			const height = MathUtils.mapLinear( z, 0, 1, heightStart, heightEnd );
			for ( let i = 0, l = total; i < l; i ++ ) {

				const [ lat, lon ] = latlon[ i ];
				if ( lat >= latStart && lat <= latEnd && lon >= lonStart && lon <= lonEnd ) {

					const v = getVector( usePool );
					target.push( v );
					this.getCartographicToPosition( lat, lon, height, v );

				}

			}

		}

		return target;

	}

	getBoundingBox( box, matrix ) {

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const midLat = ( latStart + latEnd ) * 0.5;
		const midLon = ( lonStart + lonEnd ) * 0.5;
		const fullyAboveEquator = latStart > 0.0;
		const fullyBelowEquator = latEnd < 0.0;

		let latitudeNearestToEquator;
		if ( fullyAboveEquator ) {

			latitudeNearestToEquator = latStart;

		} else if ( fullyBelowEquator ) {

			latitudeNearestToEquator = latEnd;

		} else {

			latitudeNearestToEquator = 0;

		}

		// measure the extents
		let minX, maxX, minY, maxY, minZ, maxZ;
		if ( lonEnd - lonStart <= PI ) {

			// extract the axes
			this.getCartographicToNormal( midLat, midLon, _orthoZ );
			_orthoY.set( 0, 0, 1 );
			_orthoX.crossVectors( _orthoY, _orthoZ ).normalize();
			_orthoY.crossVectors( _orthoZ, _orthoX ).normalize();

			// construct the frame
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );
			_invMatrix.copy( matrix ).invert();

			// extract x
			this.getCartographicToPosition( latitudeNearestToEquator, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxX = Math.abs( _vec.x );
			minX = - maxX;

			// extract y
			this.getCartographicToPosition( latEnd, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxY = _vec.y;

			this.getCartographicToPosition( latEnd, midLon, heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxY = Math.max( _vec.y, maxY );

			this.getCartographicToPosition( latStart, lonStart, heightEnd, _vec ).applyMatrix4( _invMatrix );
			minY = _vec.y;

			this.getCartographicToPosition( latStart, midLon, heightEnd, _vec ).applyMatrix4( _invMatrix );
			minY = Math.min( _vec.y, minY );

			// extract z
			this.getCartographicToPosition( midLat, midLon, heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxZ = _vec.z;

			this.getCartographicToPosition( latStart, lonStart, heightStart, _vec ).applyMatrix4( _invMatrix );
			minZ = _vec.z;

		} else {

			// extract a vector towards the middle of the region
			this.getCartographicToPosition( latitudeNearestToEquator, midLon, heightEnd, _orthoZ );
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
			this.getCartographicToPosition( latitudeNearestToEquator, midLon + HALF_PI, heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxX = Math.abs( _vec.x );
			minX = - maxX;

			// y extents
			// measure the top of the region, accounting for the diagonal tilt of the edge
			this.getCartographicToPosition( latEnd, 0, fullyBelowEquator ? heightStart : heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxY = _vec.y;

			// measure the bottom of the region, accounting for the diagonal tilt of the edge
			this.getCartographicToPosition( latStart, 0, fullyAboveEquator ? heightStart : heightEnd, _vec ).applyMatrix4( _invMatrix );
			minY = _vec.y;

			// z extends
			// measure the furthest point at the center of the region
			this.getCartographicToPosition( latitudeNearestToEquator, midLon, heightEnd, _vec ).applyMatrix4( _invMatrix );
			maxZ = _vec.z;

			// measure the opposite end, which is guaranteed to be at the furthest extents since this lon region extents is > PI
			this.getCartographicToPosition( latitudeNearestToEquator, lonEnd, heightEnd, _vec ).applyMatrix4( _invMatrix );
			minZ = _vec.z;

		}

		// set the box
		box.min.set( minX, minY, minZ );
		box.max.set( maxX, maxY, maxZ );

		// center the frame
		box.getCenter( _vec );
		box.min.sub( _vec );
		box.max.sub( _vec );

		_vec.applyMatrix4( matrix );
		matrix.setPosition( _vec );

	}

	getBoundingSphere( sphere, center ) {

		resetPool();

		const points = this._getPoints( true );
		sphere.makeEmpty();
		sphere.setFromPoints( points, center );

	}

}
