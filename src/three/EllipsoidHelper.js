import { EllipsoidRegion } from '../math/EllipsoidRegion.js';
import { Mesh, Vector3, Spherical, Triangle, MathUtils, BoxGeometry } from 'three';

const _norm = new Vector3();
const _norm2 = new Vector3();
const _pos = new Vector3();

export class EllipsoidHelper extends Mesh {

	constructor( ellipsoidRegion = new EllipsoidRegion() ) {

		super();
		this.ellipsoidRegion = ellipsoidRegion;
		this.update();


	}

	update() {

		const { ellipsoidRegion } = this;
		this.geometry.dispose();

		const {
			latStart = - Math.PI / 2, latEnd = Math.PI / 2,
			lonStart = 0, lonEnd = 2 * Math.PI,
			heightStart = 0, heightEnd = 0,
		} = ellipsoidRegion;

		const geometry = new BoxGeometry( 1, 1, 1, 10, 10 );
		const { normal, position } = geometry.attributes;
		const refPosition = position.clone();

		for ( let i = 0, l = position.count; i < l; i ++ ) {

			_pos.fromBufferAttribute( position, i );

			const lat = MathUtils.mapLinear( _pos.x, - 0.5, 0.5, latStart, latEnd );
			const lon = MathUtils.mapLinear( _pos.y, - 0.5, 0.5, lonStart, lonEnd );

			let height = heightStart;
			ellipsoidRegion.getCartographicToNormal( lat, lon, _norm );
			if ( _pos.z < 0 ) {

				height = heightEnd;

			}
			ellipsoidRegion.getCartographicToPosition( lat, lon, height, _pos );
			position.setXYZ( i, ..._pos );

		}

		geometry.computeVertexNormals();

		for ( let i = 0, l = refPosition.count; i < l; i ++ ) {

			_pos.fromBufferAttribute( refPosition, i );

			const lat = MathUtils.mapLinear( _pos.x, - 0.5, 0.5, latStart, latEnd );
			const lon = MathUtils.mapLinear( _pos.y, - 0.5, 0.5, lonStart, lonEnd );

			_norm.fromBufferAttribute( normal, i );
			ellipsoidRegion.getCartographicToNormal( lat, lon, _norm2 );

			if ( Math.abs( _norm.dot( _norm2 ) ) > 0.1 ) {

				if ( _pos.z > 0 ) {

					_norm2.multiplyScalar( - 1 );

				}

				normal.setXYZ( i, ..._norm2 );

			}

		}

		this.geometry = geometry;

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}
