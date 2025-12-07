import { LoaderBase } from '3d-tiles-renderer/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

export class GLTFLoader extends LoaderBase {

	constructor( scene ) {

		super();
		this.scene = scene;
		this.adjustmentTransform = BABYLON.Matrix.Identity();

	}

	async parse( buffer, uri ) {

		const { scene, workingPath, adjustmentTransform } = this;

		// ensure working path ends in a slash for proper resource resolution
		let rootUrl = workingPath;
		if ( rootUrl.length && ! /[\\/]$/.test( rootUrl ) ) {

			rootUrl += '/';

		}

		// Use unique filename to prevent texture caching issues
		// TODO: What is the correct method for loading gltf files in babylon?
		const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
			rootUrl,
			new File( [ buffer ], uri ),
			scene,
			null,
			'.glb',
		);

		container.addAllToScene();

		// retrieve the primary scene
		const root = container.meshes[ 0 ];

		// ensure rotationQuaternion is initialized so we can decompose the matrix
		root.rotationQuaternion = BABYLON.Quaternion.Identity();

		// adjust the transform the model by the necessary rotation correction
		adjustmentTransform
			.multiply( root.computeWorldMatrix( true ) )
			.decompose( root.scaling, root.rotationQuaternion, root.position );

		return {
			scene: root,
			container,
		};

	}

}
