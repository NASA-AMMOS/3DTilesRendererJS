import { Ellipsoid, sphericalPhiToLatitude, latitudeToSphericalPhi } from '../math/Ellipsoid.js';
import { EllipsoidRegion } from '../math/EllipsoidRegion.js';
import { Mesh, SphereGeometry, Vector3, Spherical, Triangle } from 'three';

const _norm = new Vector3();
const _faceNorm = new Vector3();
const _pos = new Vector3();
const _spherical = new Spherical();
const _tri = new Triangle();

export class EllipsoidHelper extends Mesh {

	constructor( ellipsoidRegion = new EllipsoidRegion() ) {

		super();
		this.ellipsoidRegion = ellipsoidRegion;
		this.update();

	}

	update() {

		const { ellipsoidRegion } = this;
		const {
			latStart = - Math.PI / 2, latEnd = Math.PI / 2,
			lonStart = 0, lonEnd = 2 * Math.PI,
			heightStart = 0, heightEnd = 0,
		} = ellipsoidRegion;

		const phiStart = latitudeToSphericalPhi( latStart );
		const phiEnd = latitudeToSphericalPhi( latEnd );
		const phiLength = phiStart - phiEnd;

		this.geometry.dispose();
		this.geometry = new SphereGeometry(
			1, 32, 32,
			lonStart, lonEnd - lonStart,
			phiEnd, phiLength,
		).toNonIndexed();

		const { geometry } = this;
		const { normal, position } = geometry.attributes;

		for ( let i = 0, l = position.count; i < l; i ++ ) {

			_pos.fromBufferAttribute( position, i );
			_norm.fromBufferAttribute( normal, i );

			_spherical.setFromVector3( _pos );

			const lat = sphericalPhiToLatitude( _spherical.phi );
			const lon = _spherical.theta - Math.PI / 2;
			ellipsoidRegion.getCartographicToPosition( lat, lon, _pos );
			ellipsoidRegion.getCartographicToNormal( lat, lon, _norm );

			normal.setXYZ( i, ..._norm );
			position.setXYZ( i, ..._pos );

		}

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}
