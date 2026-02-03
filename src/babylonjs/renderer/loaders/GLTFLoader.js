import { LoaderBase } from '3d-tiles-renderer/core';
import { Matrix, Quaternion, ImportMeshAsync } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/2.0';

const _worldMatrix = /* @__PURE__ */ Matrix.Identity();

export class GLTFLoader extends LoaderBase {

	constructor( scene ) {

		super();
		this.scene = scene;
		this.adjustmentTransform = Matrix.Identity();

	}


	async parse( buffer, uri, extension ) {

		const { scene, workingPath, adjustmentTransform } = this;

		// ensure working path ends in a slash for proper resource resolution
		let rootUrl = workingPath;
		if ( rootUrl.length && ! /[\\/]$/.test( rootUrl ) ) {

			rootUrl += '/';

		}

		// load the file
		const pluginExtension = extension === 'gltf' ? '.gltf' : '.glb';
		let metadata = null;
		const container = await ImportMeshAsync(
			new File( [ buffer ], uri ),
			scene,
			{
				pluginExtension,
				rootUrl,
				pluginOptions: {
					'gltf': {
						onParsed: ( loaderData ) => {

							// loaderData.json contains the full glTF JSON
							metadata = loaderData.json;

						}
					}
				}
			}
		);

		// retrieve the primary scene
		const root = container.meshes[ 0 ];

		// ensure rotationQuaternion is initialized so we can decompose the matrix
		root.rotationQuaternion = Quaternion.Identity();

		// adjust the transform the model by the necessary rotation correction
		const worldMatrix = root.computeWorldMatrix( true );
		adjustmentTransform.multiplyToRef( worldMatrix, _worldMatrix );
		_worldMatrix.decompose( root.scaling, root.rotationQuaternion, root.position );

		return {
			scene: root,
			container,
			metadata,
		};

	}

}
