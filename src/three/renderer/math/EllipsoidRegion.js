import { Matrix4, Vector3, Box3 } from 'three';
import { Ellipsoid } from './Ellipsoid.js';

const EPSILON = 1e-13;
const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = new Vector3();
const _orthoY = new Vector3();
const _orthoZ = new Vector3();
const _vec = new Vector3();
const _invMatrix = new Matrix4();
const _box = new Box3();
const _matrix = new Matrix4();

function expandSphereRadius( vec, target ) {

	target.radius = Math.max( target.radius, vec.distanceToSquared( target.center ) );

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

	// Samples critical points across the region and calls the callback for each point.
	// This includes corners, midpoints, cardinal axis alignments, and equator crossings.
	forEachCriticalPoint( callback ) {

		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		const latMid = ( latStart + latEnd ) * 0.5;
		const lonMid = ( lonStart + lonEnd ) * 0.5;

		// collect critical longitude values to sample
		const lonSamples = new Set();
		lonSamples.add( lonStart );
		lonSamples.add( lonEnd );
		lonSamples.add( lonMid );

		// add cardinal axis longitudes if they fall within the longitude range
		// these are critical for triaxial ellipsoids where axes have different radii
		const cardinalLongitudes = [ 0, HALF_PI, PI, PI + HALF_PI ];
		for ( let cardinalLon of cardinalLongitudes ) {

			// normalize longitude to 0-2π range for comparison
			let normalizedStart = lonStart % ( 2 * PI );
			let normalizedEnd = lonEnd % ( 2 * PI );
			if ( normalizedStart < 0 ) {

				normalizedStart += 2 * PI;

			}

			if ( normalizedEnd < 0 ) {

				normalizedEnd += 2 * PI;

			}

			cardinalLon = lonStart + cardinalLon - normalizedStart;

			if ( cardinalLon >= lonStart && cardinalLon <= lonEnd ) {

				lonSamples.add( cardinalLon );

			}

		}

		// check the bowing point at the equator
		const latSteps = [ latStart, latEnd ];
		if ( latStart < 0 && latEnd > 0 ) {

			latSteps.splice( 1, 0, 0 );

		}

		// test all longitude samples at critical latitudes
		const lonArray = Array.from( lonSamples ).sort( ( a, b ) => a - b );
		for ( let h of [ heightStart, heightEnd ] ) {

			for ( let lat of latSteps ) {

				for ( let lon of lonArray ) {

					callback( lat, lon, h );

				}

			}

		}

		// also test latitude midpoints at all sampled longitudes
		for ( let lon of lonArray ) {

			callback( latMid, lon, heightEnd );

		}

	}

	getBoundingBox( box, matrix ) {

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
			// check the most bowing point near the equator
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
			this.getCartographicToPosition( latMid, lonMid, heightEnd, _vec ).applyMatrix4( _invMatrix );
			max.z = _vec.z;

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

		// sample all critical points to ensure tight fit
		this.forEachCriticalPoint( ( lat, lon, height ) => {

			this.getCartographicToPosition( lat, lon, height, _vec ).applyMatrix4( _invMatrix );
			min.x = Math.min( _vec.x, min.x );
			min.y = Math.min( _vec.y, min.y );
			min.z = Math.min( _vec.z, min.z );

			max.x = Math.max( _vec.x, max.x );
			max.y = Math.max( _vec.y, max.y );
			max.z = Math.max( _vec.z, max.z );

		} );

		// center the frame
		box.getCenter( _vec );
		box.min.sub( _vec ).multiplyScalar( 1 + EPSILON );
		box.max.sub( _vec ).multiplyScalar( 1 + EPSILON );

		_vec.applyMatrix4( matrix );
		matrix.setPosition( _vec );

	}

	getBoundingSphere( sphere, center = null ) {

		// TODO: this could be optimized
		// if no center provided, compute the geometric center of the region
		if ( center === null ) {

			// use the OBB function to get a reasonable center
			this.getBoundingBox( _box, _matrix );
			sphere.center.setFromMatrixPosition( _matrix );
			sphere.radius = 0;

			if ( this.lonEnd - this.lonStart > Math.PI ) {

				sphere.center.x = 0;
				sphere.center.y = 0;

			}

		} else {

			sphere.center.copy( center );
			sphere.radius = 0;

		}

		// sample all critical points and expand the sphere
		this.forEachCriticalPoint( ( lat, lon, h ) => {

			this.getCartographicToPosition( lat, lon, h, _vec );
			expandSphereRadius( _vec, sphere );

		} );

		sphere.radius = Math.sqrt( sphere.radius ) * ( 1 + EPSILON );

	}

}
