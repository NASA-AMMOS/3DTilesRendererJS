import { MathUtils, Matrix4 } from 'three';
import { Vector3 } from 'three';
import { Ellipsoid } from '../math/Ellipsoid.js';

const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = new Vector3();
const _orthoY = new Vector3();
const _orthoZ = new Vector3();
const _invMatrix = new Matrix4();
const _points = [];

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

	_getPoints( target ) {

		const countLat = 3;
		const countLon = 5;
		const {
			latStart, latEnd,
			lonStart, lonEnd,
			heightStart, heightEnd,
		} = this;

		// initialize the necessary number of vector3s
		const total = countLat * countLon * 2;
		for ( let i = 0, l = total; i < l; i ++ ) {

			if ( ! target[ i ] ) target.push( new Vector3() );

		}

		target.length = total;

		// generate a point along the region
		let index = 0;
		for ( let z = 0; z <= 1; z ++ ) {

			const height = MathUtils.mapLinear( z, 0, 1, heightStart, heightEnd );
			for ( let x = 0; x < countLat; x ++ ) {

				const lat = MathUtils.mapLinear( x, 0, countLat - 1, latStart, latEnd );
				for ( let y = 0; y < countLon; y ++ ) {

					const lon = MathUtils.mapLinear( y, 0, countLon - 1, lonStart, lonEnd );
					this.getCartographicToPosition( lat, lon, height, target[ index ++ ] );

				}

			}

		}

	}

	getBoundingBox( box, matrix ) {

		const {
			latStart, latEnd,
			lonStart, lonEnd,
		} = this;

		// get the midway point for the region
		const midLat = MathUtils.mapLinear( 0.5, 0, 1, latStart, latEnd );
		const midLon = MathUtils.mapLinear( 0.5, 0, 1, lonStart, lonEnd );

		// get the frame matrix for the box - works well for smaller regions
		this.getCartographicToNormal( midLat, midLon, _orthoZ );
		_orthoY.set( 0, 0, 1 );
		_orthoX.crossVectors( _orthoY, _orthoZ );
		_orthoY.crossVectors( _orthoX, _orthoZ );
		matrix.makeBasis( _orthoX, _orthoY, _orthoZ );

		// transform the points into the local frame
		_invMatrix.copy( matrix ).invert();

		this._getPoints( _points );
		for ( let i = 0, l = _points.length; i < l; i ++ ) {

			_points[ i ].applyMatrix4( _invMatrix );

		}

		// init the box
		box.makeEmpty();
		box.setFromPoints( _points );

	}

	getBoundingSphere( sphere, center ) {

		sphere.makeEmpty();
		this._getPoints( _points );
		sphere.setFromPoints( _points, center );

	}

}
