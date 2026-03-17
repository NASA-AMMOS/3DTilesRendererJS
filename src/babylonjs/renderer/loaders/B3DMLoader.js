import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { B3DMLoaderBase } from '3d-tiles-renderer/core';
import { GLTFLoader } from './GLTFLoader.js';

/**
 * Babylon.js loader for B3DM (Batched 3D Model) tile content. Parses the B3DM binary
 * structure and delegates embedded GLB loading to GLTFLoader.
 * @extends B3DMLoaderBase
 */
export class B3DMLoader extends B3DMLoaderBase {

	/**
	 * @param {Scene} scene - The Babylon.js scene to load assets into.
	 */
	constructor( scene ) {

		super();
		/**
		 * The Babylon.js scene assets are loaded into.
		 * @type {Scene}
		 */
		this.scene = scene;
		/**
		 * Transform applied after loading to correct coordinate system orientation.
		 * @type {Matrix}
		 */
		this.adjustmentTransform = Matrix.Identity();

	}

	/**
	 * @param {ArrayBuffer} buffer - The raw B3DM file data.
	 * @param {string} uri - URI used for resolving relative resources.
	 * @returns {Promise<Object>}
	 */
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
