import { I3DMLoaderBase } from '../base/I3DMLoaderBase.js';
import { DefaultLoadingManager, Matrix4, InstancedMesh, Vector3, Quaternion } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const tempPos = new Vector3();
const tempQuat = new Quaternion();
const tempSca = new Vector3();
const tempMat = new Matrix4();
export class I3DMLoader extends I3DMLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		return super
			.parse( buffer )
			.then( i3dm => {

				const { featureTable, batchTable } = i3dm;
				const gltfBuffer = i3dm.glbBytes.slice().buffer;
				return new Promise( ( resolve, reject ) => {

					const manager = this.manager;
					const loader = manager.getHandler( 'path.gltf' ) || new GLTFLoader( manager );
					loader.parse( gltfBuffer, null, model => {

						const INSTANCES_LENGTH = featureTable.getData( 'INSTANCES_LENGTH' );

						// RTC_CENTER
						// QUANTIZED_VOLUME_OFFSET
						// QUANTIZED_VOLUME_SCALE
						// EAST_NORTH_UP

						const POSITION = featureTable.getData( 'POSITION', INSTANCES_LENGTH, 'FLOAT', 'VEC3' );

						// POSITION_QUANTIZED
						// NORMAL_UP
						// NORMAL_RIGHT
						// NORMAL_UP_OCT32P
						// NORMAL_RIGHT_OCT32P
						// SCALE
						// SCALE_NON_UNIFORM
						// BATCH_ID

						const instanceMap = new Map();
						const instances = [];
						model.scene.traverse( child => {

							if ( child.isMesh ) {

								const { geometry, material } = child;
								const instancedMesh = new InstancedMesh( geometry, material, INSTANCES_LENGTH );
								instances.push( instancedMesh );
								instanceMap.set( child, instancedMesh );

							}

						} );

						// replace the meshes with instanced meshes
						instanceMap.forEach( ( instancedMesh, mesh ) => {

							const parent = mesh.parent;
							if ( parent ) {

								// Mesh have no children
								parent.remove( mesh );
								parent.add( instancedMesh );

							}


						} );

						for ( let i = 0; i < INSTANCES_LENGTH; i ++ ) {

							// TODO: handle quantized position
							tempPos.set(
								POSITION[ i * 3 + 0 ],
								POSITION[ i * 3 + 1 ],
								POSITION[ i * 3 + 2 ],
							);

							// TODO: handle normal orientation features
							tempQuat.set( 0, 0, 0, 1 );

							// TODO: handle scale features
							tempSca.set( 1, 1, 1 );

							tempMat.compose( tempPos, tempQuat, tempSca );

							for ( let j = 0, l = instances.length; j < l; j ++ ) {

								const instance = instances[ j ];
								instance.setMatrixAt( i, tempMat );

							}

						}

						model.batchTable = batchTable;
						model.featureTable = featureTable;
						resolve( model );

					}, reject );

				} );

			} );

	}

}
