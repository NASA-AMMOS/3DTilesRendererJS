import { BufferGeometry, DefaultLoadingManager, Mesh, MeshBasicMaterial, } from 'three';
import { QuantizedMeshLoaderBase } from '../../base/loaders/QuantizedMeshLoaderBase.js';
import { Ellipsoid } from '../../../three/math/Ellipsoid.js';

export class QuantizedMeshLoader extends QuantizedMeshLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.ellipsoid = new Ellipsoid();
		this.skirtLength = 10;
		this.manifold = false;

	}

	parse( buffer ) {

		const {
			header,
			indices,
			vertexData,
			edgeIndices,
			extensions,
		} = super.parse( buffer );

		const geometry = new BufferGeometry();
		const material = new MeshBasicMaterial();


		// TODO: construct geometry with skirts

		// TODO: construct and apply extensions

		const mesh = new Mesh( geometry, material );
		mesh.position.set( ...header.center );

		return mesh;

	}

}
