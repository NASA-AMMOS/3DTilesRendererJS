import { MathUtils, Matrix4 } from 'three';
import { Vector3 } from 'three';
import { Ellipsoid } from './Ellipsoid.js';

const PI = Math.PI;
const HALF_PI = PI / 2;

const _orthoX = new Vector3();
const _orthoY = new Vector3();
const _orthoZ = new Vector3();
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

		resetPool();

		const {
			latStart, latEnd,
			lonStart, lonEnd,
		} = this;

		const latRange = latEnd - latStart;
		if ( latRange < PI / 2 ) {

			// get the midway point for the region
			const midLat = MathUtils.mapLinear( 0.5, 0, 1, latStart, latEnd );
			const midLon = MathUtils.mapLinear( 0.5, 0, 1, lonStart, lonEnd );

			// get the frame matrix for the box - works well for smaller regions
			this.getCartographicToNormal( midLat, midLon, _orthoZ );
			_orthoY.set( 0, 0, 1 );
			_orthoX.crossVectors( _orthoY, _orthoZ );
			_orthoY.crossVectors( _orthoX, _orthoZ );
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );

		} else {

			_orthoX.set( 1, 0, 0 );
			_orthoY.set( 0, 1, 0 );
			_orthoZ.set( 0, 0, 1 );
			matrix.makeBasis( _orthoX, _orthoY, _orthoZ );

		}

		// transform the points into the local frame
		_invMatrix.copy( matrix ).invert();

		const points = this._getPoints( true );
		for ( let i = 0, l = points.length; i < l; i ++ ) {

			points[ i ].applyMatrix4( _invMatrix );

		}

		// init the box
		box.makeEmpty();
		box.setFromPoints( points );

	}

	getBoundingSphere( sphere, center ) {

		resetPool();

		const points = this._getPoints( true );
		sphere.makeEmpty();
		sphere.setFromPoints( points, center );

	}

}
