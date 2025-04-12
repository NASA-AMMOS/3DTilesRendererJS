import { BufferGeometry, DefaultLoadingManager, MathUtils, Mesh, MeshBasicMaterial, Vector3, } from 'three';
import { QuantizedMeshLoaderBase } from '../../base/loaders/QuantizedMeshLoaderBase.js';
import { Ellipsoid } from '../../../three/math/Ellipsoid.js';

const _vec = new Vector3();
export class QuantizedMeshLoader extends QuantizedMeshLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.ellipsoid = new Ellipsoid();
		this.skirtLength = 10;
		this.manifold = false;

	}

	parse( buffer, options ) {

		const {
			ellipsoid,
		} = this;

		const {
			header,
			indices,
			vertexData,
			edgeIndices,
			extensions,
		} = super.parse( buffer );

		const {
			minLat = - Math.PI / 2,
			maxLat = Math.PI / 2,
			minLon = - Math.PI,
			maxLon = Math.PI,
		} = options;

		const geometry = new BufferGeometry();
		const material = new MeshBasicMaterial();

		const vertexCount = vertexData.u.length;
		const positions = new Float32Array( vertexCount * 3 );
		const uvs = new Float32Array( vertexCount * 2 );

		const MAX_UINT16 = 2 ** 16 - 1;
		for ( let i = 0; i < vertexCount; i ++ ) {

			const u = vertexData.u[ i ] / MAX_UINT16;
			const v = vertexData.v[ i ] / MAX_UINT16;
			const h = vertexData.height[ i ] / MAX_UINT16;
			uvs[ 2 * i + 0 ] = u;
			uvs[ 2 * i + 1 ] = v;

			const height = MathUtils.lerp( header.minHeight, header.maxHeight, h );
			const lon = MathUtils.lerp( minLon, maxLon, u );
			const lat = MathUtils.lerp( minLat, maxLat, v );

			ellipsoid.getCartographicToPosition( lat, lon, height, _vec );
			positions[ 3 * i + 0 ] = _vec.x;
			positions[ 3 * i + 1 ] = _vec.y;
			positions[ 3 * i + 2 ] = _vec.z;

		}

		// TODO: construct indices / edges

		// TODO: construct skirts

		// TODO: construct bottom faces

		// TODO: apply extensions

		const mesh = new Mesh( geometry, material );
		mesh.position.set( ...header.center );

		return mesh;

	}

}
