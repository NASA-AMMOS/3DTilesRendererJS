import { B3DMLoaderBase } from '../base/B3DMLoaderBase.js';
import { DefaultLoadingManager, Matrix4 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class B3DMLoader extends B3DMLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.adjustmentTransform = new Matrix4();

	}

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

				const rtcCenter = featureTable.getData( 'RTC_CENTER' );
				if ( rtcCenter ) {

					scene.position.x += rtcCenter[ 0 ];
					scene.position.y += rtcCenter[ 1 ];
					scene.position.z += rtcCenter[ 2 ];

				}

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
