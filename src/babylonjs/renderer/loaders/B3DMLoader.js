import { Matrix } from '@babylonjs/core';
import { B3DMLoaderBase } from '3d-tiles-renderer/core';
import { GLTFLoader } from './GLTFLoader.js';

export class B3DMLoader extends B3DMLoaderBase {

	constructor( scene ) {

		super();
		this.scene = scene;
		this.adjustmentTransform = Matrix.Identity();

	}

	async parse( buffer, uri ) {

		const b3dm = super.parse( buffer );

		const { scene, workingPath, fetchOptions, adjustmentTransform } = this;

		// init gltf loader
		const gltfLoader = new GLTFLoader( scene );
		gltfLoader.workingPath = workingPath;
		gltfLoader.fetchOptions = fetchOptions;
		if ( adjustmentTransform ) {

			gltfLoader.adjustmentTransform = adjustmentTransform;

		}

		// parse the file
		const result = await gltfLoader.parse( b3dm.glbBytes, uri, 'glb' );
		const gltfScene = result.scene;
		return {
			...b3dm,
			scene: gltfScene,
			container: result.container,
			metadata: result.metadata,
		};

	}

}
