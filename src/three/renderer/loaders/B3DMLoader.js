/** @import { LoadingManager, Group } from 'three' */
/** @import { BatchTable, FeatureTable } from '3d-tiles-renderer/core' */
import { B3DMLoaderBase } from '3d-tiles-renderer/core';
import { DefaultLoadingManager, Matrix4 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Loader for the legacy 3D Tiles Batched 3D Model (b3dm) format. Parses the b3dm
 * container and returns a GLTF result with `batchTable` and `featureTable` attached
 * to the resolved scene object.
 * @extends B3DMLoaderBase
 * @param {LoadingManager} [manager]
 */
export class B3DMLoader extends B3DMLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.adjustmentTransform = new Matrix4();

	}

	/**
	 * Parses a b3dm buffer and resolves to a GLTF result object extended with legacy
	 * tile metadata. Both `model` and `model.scene` receive the extra fields.
	 * @param {ArrayBuffer} buffer
	 * @returns {Promise<{ scene: Group, scenes: Array, batchTable: BatchTable, featureTable: FeatureTable }>}
	 */
	parse( buffer ) {

		const b3dm = super.parse( buffer );
		const gltfBuffer = b3dm.glbBytes.slice().buffer;
		return new Promise( ( resolve, reject ) => {

			const manager = this.manager;
			const fetchOptions = this.fetchOptions;
			const loader = manager.getHandler( 'path.gltf' ) || new GLTFLoader( manager );

			if ( fetchOptions.credentials === 'include' && fetchOptions.mode === 'cors' ) {

				loader.setCrossOrigin( 'use-credentials' );

			}

			if ( 'credentials' in fetchOptions ) {

				loader.setWithCredentials( fetchOptions.credentials === 'include' );

			}

			if ( fetchOptions.headers ) {

				loader.setRequestHeader( fetchOptions.headers );

			}

			// GLTFLoader assumes the working path ends in a slash
			let workingPath = this.workingPath;
			if ( ! /[\\/]$/.test( workingPath ) && workingPath.length ) {

				workingPath += '/';

			}

			const adjustmentTransform = this.adjustmentTransform;

			loader.parse( gltfBuffer, workingPath, model => {

				const { batchTable, featureTable } = b3dm;
				const { scene } = model;

				const rtcCenter = featureTable.getData( 'RTC_CENTER', 1, 'FLOAT', 'VEC3' );
				if ( rtcCenter ) {

					scene.position.x += rtcCenter[ 0 ];
					scene.position.y += rtcCenter[ 1 ];
					scene.position.z += rtcCenter[ 2 ];

				}

				model.scene.updateMatrix();
				model.scene.matrix.multiply( adjustmentTransform );
				model.scene.matrix.decompose( model.scene.position, model.scene.quaternion, model.scene.scale );

				model.batchTable = batchTable;
				model.featureTable = featureTable;

				scene.batchTable = batchTable;
				scene.featureTable = featureTable;

				resolve( model );

			}, reject );

		} );

	}

}
