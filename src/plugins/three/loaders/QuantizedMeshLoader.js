import { BufferGeometry, DefaultLoadingManager, Mesh, MeshBasicMaterial, } from 'three';
import { QuantizedMeshLoaderBase } from '../../base/loaders/QuantizedMeshLoaderBase.js';
import { Ellipsoid } from '../../../three/math/Ellipsoid.js';

export class QuantizedMeshLoader extends QuantizedMeshLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.ellipsoid = new Ellipsoid();

	}

	parse( buffer ) {

		const result = super.parse( buffer );

		const geometry = new BufferGeometry();
		const material = new MeshBasicMaterial();

		// TODO: construct geometry with skirts

		// TODO: construct and apply extensions

		const mesh = new Mesh( geometry, material );
		mesh.position.set( ...result.center );

		return mesh;

	}

}
