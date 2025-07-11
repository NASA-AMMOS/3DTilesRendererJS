import { BatchedMesh, Matrix4, Vector3, Source } from 'three';

const matrix = new Matrix4();
const vec1 = new Vector3();
const vec2 = new Vector3();
export class ModelViewBatchedMesh extends BatchedMesh {

	constructor( ...args ) {

		super( ...args );

		this.resetDistance = 1e4;
		this._matricesTextureHandle = null;
		this._lastCameraPos = new Matrix4();
		this._forceUpdate = true;

		this._matrices = [];

	}

	setMatrixAt( instanceId, matrix ) {

		super.setMatrixAt( instanceId, matrix );
		this._forceUpdate = true;

		// save the matrices in their original float64 format to avoid
		// precision errors when multiplying later
		const matrices = this._matrices;
		while ( matrices.length <= instanceId ) {

			matrices.push( new Matrix4() );

		}

		matrices[ instanceId ].copy( matrix );

	}

	setInstanceCount( ...args ) {

		super.setInstanceCount( ...args );

		const matrices = this._matrices;
		while ( matrices.length > this.instanceCount ) {

			matrices.pop();

		}

	}

	onBeforeRender( renderer, scene, camera, geometry, material, group ) {

		// ensure matrices are complete and up to date
		super.onBeforeRender( renderer, scene, camera, geometry, material, group );

		// retrieve camera before and after camera positions
		vec1.setFromMatrixPosition( camera.matrixWorld );
		vec2.setFromMatrixPosition( this._lastCameraPos );

		// initialize the model-view matrix texture if needed
		const matricesTexture = this._matricesTexture;
		let modelViewMatricesTexture = this._modelViewMatricesTexture;
		if (
			! modelViewMatricesTexture ||
			modelViewMatricesTexture.image.width !== matricesTexture.image.width ||
			modelViewMatricesTexture.image.height !== matricesTexture.image.height
		) {

			if ( modelViewMatricesTexture ) {

				modelViewMatricesTexture.dispose();

			}

			modelViewMatricesTexture = matricesTexture.clone();
			modelViewMatricesTexture.source = new Source( {
				...modelViewMatricesTexture.image,
				data: modelViewMatricesTexture.image.data.slice(),
			} );

			this._modelViewMatricesTexture = modelViewMatricesTexture;

		}

		// check if we need to update the model view matrices
		if ( this._forceUpdate || vec1.distanceTo( vec2 ) > this.resetDistance ) {

			// transform each objects matrix into local camera frame to avoid precision issues
			const matrices = this._matrices;
			const modelViewArray = modelViewMatricesTexture.image.data;
			for ( let i = 0; i < this.maxInstanceCount; i ++ ) {

				const instanceMatrix = matrices[ i ];
				if ( instanceMatrix ) {

					matrix.copy( instanceMatrix );

				} else {

					matrix.identity();

				}

				matrix
					.premultiply( this.matrixWorld )
					.premultiply( camera.matrixWorldInverse )
					.toArray( modelViewArray, i * 16 );

			}

			modelViewMatricesTexture.needsUpdate = true;
			this._lastCameraPos.copy( camera.matrixWorld );
			this._forceUpdate = false;

		}

		// save handles, and transform the matrix world into the camera frame used to position the mesh instances
		// to offset the position shift.
		this._matricesTextureHandle = this._matricesTexture;
		this._matricesTexture = this._modelViewMatricesTexture;
		this.matrixWorld.copy( this._lastCameraPos );

	}

	onAfterRender() {

		this.updateMatrixWorld();
		this._matricesTexture = this._matricesTextureHandle;
		this._matricesTextureHandle = null;

	}

	onAfterShadow( renderer, object, camera, shadowCamera, geometry, depthMaterial/* , group */ ) {

		this.onAfterRender( renderer, null, shadowCamera, geometry, depthMaterial );

	}

	dispose() {

		super.dispose();

		if ( this._modelViewMatricesTexture ) {

			this._modelViewMatricesTexture.dispose();

		}

	}

}
