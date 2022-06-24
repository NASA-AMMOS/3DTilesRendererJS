import { I3DMLoaderBase } from '../base/I3DMLoaderBase.js';
import { DefaultLoadingManager, Matrix4, InstancedMesh, Vector3, Quaternion } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const tempFwd = new Vector3();
const tempUp = new Vector3();
const tempRight = new Vector3();
const tempPos = new Vector3();
const tempQuat = new Quaternion();
const tempSca = new Vector3();
const tempMat = new Matrix4();
export class I3DMLoader extends I3DMLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.adjustmentTransform = new Matrix4();

	}

	resolveExternalURL( url ) {

		return this.manager.resolveURL( super.resolveExternalURL( url ) );

	}

	parse( buffer ) {

		return super
			.parse( buffer )
			.then( i3dm => {

				const { featureTable, batchTable } = i3dm;
				const gltfBuffer = i3dm.glbBytes.slice().buffer;
				return new Promise( ( resolve, reject ) => {

					const fetchOptions = this.fetchOptions;
					const manager = this.manager;
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
					if ( ! /[\\/]$/.test( workingPath ) ) {

						workingPath += '/';

					}

					const adjustmentTransform = this.adjustmentTransform;

					loader.parse( gltfBuffer, workingPath, model => {

						const INSTANCES_LENGTH = featureTable.getData( 'INSTANCES_LENGTH' );
						const POSITION = featureTable.getData( 'POSITION', INSTANCES_LENGTH, 'FLOAT', 'VEC3' );
						const NORMAL_UP = featureTable.getData( 'NORMAL_UP', INSTANCES_LENGTH, 'FLOAT', 'VEC3' );
						const NORMAL_RIGHT = featureTable.getData( 'NORMAL_RIGHT', INSTANCES_LENGTH, 'FLOAT', 'VEC3' );
						const SCALE_NON_UNIFORM = featureTable.getData( 'SCALE_NON_UNIFORM', INSTANCES_LENGTH, 'FLOAT', 'VEC3' );
						const SCALE = featureTable.getData( 'SCALE', INSTANCES_LENGTH, 'FLOAT', 'SCALAR' );

						[
							'RTC_CENTER',
							'QUANTIZED_VOLUME_OFFSET',
							'QUANTIZED_VOLUME_SCALE',
							'EAST_NORTH_UP',
							'POSITION_QUANTIZED',
							'NORMAL_UP_OCT32P',
							'NORMAL_RIGHT_OCT32P',
						].forEach( feature => {

							if ( feature in featureTable.header ) {

								console.warn( `I3DMLoader: Unsupported FeatureTable feature "${ feature }" detected.` );

							}

						} );

						const instanceMap = new Map();
						const instances = [];
						model.scene.traverse( child => {

							if ( child.isMesh ) {

								const { geometry, material } = child;
								const instancedMesh = new InstancedMesh( geometry, material, INSTANCES_LENGTH );
								instancedMesh.position.copy( child.position );
								instancedMesh.rotation.copy( child.rotation );
								instancedMesh.scale.copy( child.scale );
								instances.push( instancedMesh );
								instanceMap.set( child, instancedMesh );

							}

						} );

						const averageVector = new Vector3();
						for ( let i = 0; i < INSTANCES_LENGTH; i ++ ) {

							averageVector.x += POSITION[ i * 3 + 0 ] / INSTANCES_LENGTH;
							averageVector.y += POSITION[ i * 3 + 1 ] / INSTANCES_LENGTH;
							averageVector.z += POSITION[ i * 3 + 2 ] / INSTANCES_LENGTH;

						}

						// replace the meshes with instanced meshes
						instanceMap.forEach( ( instancedMesh, mesh ) => {

							const parent = mesh.parent;
							if ( parent ) {

								// Mesh have no children
								parent.remove( mesh );
								parent.add( instancedMesh );

								// Center the instance around an average point to avoid jitter at large scales.
								// Transform the average vector by matrix world so we can account for any existing
								// transforms of the instanced mesh.
								instancedMesh.updateMatrixWorld();
								instancedMesh
									.position
									.copy( averageVector )
									.applyMatrix4( instancedMesh.matrixWorld );

							}

						} );

						for ( let i = 0; i < INSTANCES_LENGTH; i ++ ) {

							// position
							tempPos.set(
								POSITION[ i * 3 + 0 ] - averageVector.x,
								POSITION[ i * 3 + 1 ] - averageVector.y,
								POSITION[ i * 3 + 2 ] - averageVector.z,
							);

							// rotation
							if ( NORMAL_UP ) {

								tempUp.set(
									NORMAL_UP[ i * 3 + 0 ],
									NORMAL_UP[ i * 3 + 1 ],
									NORMAL_UP[ i * 3 + 2 ],
								);

								tempRight.set(
									NORMAL_RIGHT[ i * 3 + 0 ],
									NORMAL_RIGHT[ i * 3 + 1 ],
									NORMAL_RIGHT[ i * 3 + 2 ],
								);

								tempFwd.crossVectors( tempRight, tempUp )
									.normalize();

								tempMat.makeBasis(
									tempRight,
									tempUp,
									tempFwd,
								);

								tempQuat.setFromRotationMatrix( tempMat );

							} else {

								tempQuat.set( 0, 0, 0, 1 );

							}

							// scale
							if ( SCALE ) {

								tempSca.setScalar( SCALE[ i ] );

							} else if ( SCALE_NON_UNIFORM ) {

								tempSca.set(
									SCALE_NON_UNIFORM[ i * 3 + 0 ],
									SCALE_NON_UNIFORM[ i * 3 + 1 ],
									SCALE_NON_UNIFORM[ i * 3 + 2 ],
								);

							} else {

								tempSca.set( 1, 1, 1 );

							}


							tempMat.compose( tempPos, tempQuat, tempSca ).multiply( adjustmentTransform );

							for ( let j = 0, l = instances.length; j < l; j ++ ) {

								const instance = instances[ j ];
								instance.setMatrixAt( i, tempMat );

							}

						}


						model.batchTable = batchTable;
						model.featureTable = featureTable;

						model.scene.batchTable = batchTable;
						model.scene.featureTable = featureTable;

						resolve( model );

					}, reject );

				} );

			} );

	}

}
