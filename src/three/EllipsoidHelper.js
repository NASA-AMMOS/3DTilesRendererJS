import { Ellipsoid, sphericalPhiToLatitude, latitudeToSphericalPhi } from '../math/Ellipsoid.js';
import { EllipsoidRegion } from '../math/EllipsoidRegion.js';
import { Mesh, SphereGeometry, Vector3, Spherical, Triangle } from 'three';

const _norm = new Vector3();
const _faceNorm = new Vector3();
const _pos = new Vector3();
const _spherical = new Spherical();
const _tri = new Triangle();

export class EllipsoidHelper extends Mesh {

	constructor( ellipsoid = new Ellipsoid( 1, 1, 1 ), region = new EllipsoidRegion() ) {

		super();
		this.ellipsoid = ellipsoid;
		this.region = region;
		this.update();

	}

	update() {

		const { region } = this;
		const phiStart = latitudeToSphericalPhi( region.latStart );
		const phiEnd = latitudeToSphericalPhi( region.latEnd );
		const phiLength = phiStart - phiEnd;

		this.geometry.dispose();
		this.geometry = new SphereGeometry(
			1, 32, 32,
			// undefined, undefined,
			region.lonStart, region.lonEnd - region.lonStart,
			phiEnd, phiLength,
		).toNonIndexed();

		const { geometry, ellipsoid } = this;
		const { normal, position } = geometry.attributes;

		for ( let i = 0, l = position.count; i < l; i ++ ) {

			_pos.fromBufferAttribute( position, i );
			_norm.fromBufferAttribute( normal, i );

			_spherical.setFromVector3( _pos );

			const lat = sphericalPhiToLatitude( _spherical.phi );
			const lon = _spherical.theta - Math.PI / 2;
			ellipsoid.getCartographicToPosition( lat, lon, _pos );
			ellipsoid.getCartographicToNormal( lat, lon, _norm );

			normal.setXYZ( i, ..._norm );
			position.setXYZ( i, ..._pos );

		}

	}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();

	}

}
