import { I3DMLoaderBase } from '../../base/loaders/I3DMLoaderBase.js';
import { DefaultLoadingManager, Matrix4, InstancedMesh, Vector3, Quaternion } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WGS84_ELLIPSOID } from '../math/GeoConstants.js';

const tempFwd = /* @__PURE__ */ new Vector3();
const tempUp = /* @__PURE__ */ new Vector3();
const tempRight = /* @__PURE__ */ new Vector3();
const tempPos = /* @__PURE__ */ new Vector3();
const tempQuat = /* @__PURE__ */ new Quaternion();
const tempSca = /* @__PURE__ */ new Vector3();
const tempMat = /* @__PURE__ */ new Matrix4();
const tempMat2 = /* @__PURE__ */ new Matrix4();

const tempGlobePos = /* @__PURE__ */ new Vector3();
const tempEnuFrame = /* @__PURE__ */ new Matrix4();
const tempLocalQuat = /* @__PURE__ */ new Quaternion();
const tempLatLon = {};

export class I3DMLoader extends I3DMLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.adjustmentTransform = new Matrix4();
		this.ellipsoid = WGS84_ELLIPSOID.clone();

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
					let workingPath = i3dm.gltfWorkingPath ?? this.workingPath;
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
						const RTC_CENTER = featureTable.getData( 'RTC_CENTER' );
						const EAST_NORTH_UP = featureTable.getData( 'EAST_NORTH_UP' );

						[
							'QUANTIZED_VOLUME_OFFSET',
							'QUANTIZED_VOLUME_SCALE',
							'POSITION_QUANTIZED',
							'NORMAL_UP_OCT32P',
							'NORMAL_RIGHT_OCT32P',
						].forEach( feature => {

							if ( feature in featureTable.header ) {

								console.warn( `I3DMLoader: Unsupported FeatureTable feature "${ feature }" detected.` );

							}

						} );

						// get the average vector center so we can avoid floating point error due to lower
						// precision transformation calculations on the GPU
						const averageVector = new Vector3();
						for ( let i = 0; i < INSTANCES_LENGTH; i ++ ) {

							averageVector.x += POSITION[ i * 3 + 0 ] / INSTANCES_LENGTH;
							averageVector.y += POSITION[ i * 3 + 1 ] / INSTANCES_LENGTH;
							averageVector.z += POSITION[ i * 3 + 2 ] / INSTANCES_LENGTH;

						}

						// find all the children and create associated instance meshes
						const instances = [];
						const meshes = [];
						model.scene.updateMatrixWorld();

						model.scene.traverse( child => {

							if ( child.isMesh ) {

								meshes.push( child );

								const { geometry, material } = child;
								const instancedMesh = new InstancedMesh( geometry, material, INSTANCES_LENGTH );
								instancedMesh.position.copy( averageVector );

								if ( RTC_CENTER ) {

									instancedMesh.position.x += RTC_CENTER[ 0 ];
									instancedMesh.position.y += RTC_CENTER[ 1 ];
									instancedMesh.position.z += RTC_CENTER[ 2 ];

								}

								instances.push( instancedMesh );

							}

						} );

						// generate positions for all instances
						for ( let i = 0; i < INSTANCES_LENGTH; i ++ ) {

							// position
							tempPos.set(
								POSITION[ i * 3 + 0 ] - averageVector.x,
								POSITION[ i * 3 + 1 ] - averageVector.y,
								POSITION[ i * 3 + 2 ] - averageVector.z,
							);

							// rotation
							tempQuat.identity();

							// account for EAST_NORTH_UP per-instance below

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

							}

							// scale
							tempSca.set( 1, 1, 1 );

							if ( SCALE_NON_UNIFORM ) {

								tempSca.set(
									SCALE_NON_UNIFORM[ i * 3 + 0 ],
									SCALE_NON_UNIFORM[ i * 3 + 1 ],
									SCALE_NON_UNIFORM[ i * 3 + 2 ],
								);

							}

							if ( SCALE ) {

								tempSca.multiplyScalar( SCALE[ i ] );

							}

							// multiple in the original meshes world transform
							for ( let j = 0, l = instances.length; j < l; j ++ ) {

								const instance = instances[ j ];
								tempLocalQuat.copy( tempQuat );

								// Handle east-north-up frame generation
								if ( EAST_NORTH_UP ) {

									instance.updateMatrixWorld();

									// transform the instance position to global frame and get the rotation from the associated ENU frame.
									tempGlobePos.copy( tempPos ).applyMatrix4( instance.matrixWorld );
									this.ellipsoid.getPositionToCartographic( tempGlobePos, tempLatLon );
									this.ellipsoid.getEastNorthUpFrame( tempLatLon.lat, tempLatLon.lon, tempEnuFrame );
									tempLocalQuat.setFromRotationMatrix( tempEnuFrame );

								}

								tempMat.compose( tempPos, tempLocalQuat, tempSca ).multiply( adjustmentTransform );

								const mesh = meshes[ j ];
								tempMat2.multiplyMatrices( tempMat, mesh.matrixWorld );
								instance.setMatrixAt( i, tempMat2 );

							}

						}

						// replace all geometry with the instances
						model.scene.clear();
						model.scene.add( ...instances );

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
