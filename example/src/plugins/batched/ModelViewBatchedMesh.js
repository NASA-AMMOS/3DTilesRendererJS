import { BatchedMesh, Matrix4, Source } from 'three';

const matrix = new Matrix4();
export class ModelViewBatchedMesh extends BatchedMesh {

	constructor( ...args ) {

		super( ...args );
		this._initMatricesTexture();
		this._matricesTextureHandle = null;

	}

	_initModelViewMatricesTexture() {

		this._modelViewMatricesTexture = this._matricesTexture.clone();
		this._modelViewMatricesTexture.source = new Source( {
			...this._modelViewMatricesTexture.image,
			data: this._modelViewMatricesTexture.image.data.slice(),
		} );

	}

	_initMatricesTexture() {

		super._initMatricesTexture();
		this._initModelViewMatricesTexture();

	}

	onBeforeRender( renderer, scene, camera, geometry, material, group ) {

		super.onBeforeRender( renderer, scene, camera, geometry, material, group );

		// TODO: resize and re-instantiate the texture here if the size is different

		// TODO: only update here if the camera matrix has shifted significantly from it's previous
		// position and apply the delta matrix with the matrix world
		const drawInfo = this._drawInfo;
		const matricesArray = this._matricesTexture.image.data;
		const modelViewArray = this._modelViewMatricesTexture.image.data;
		for ( let i = 0; i < drawInfo.length; i ++ ) {

			matrix
				.fromArray( matricesArray, i * 16 )
				.premultiply( this.matrixWorld )
				.premultiply( camera.matrixWorldInverse )
				.toArray( modelViewArray, i * 16 );

		}

		this._modelViewMatricesTexture.needsUpdate = true;

		this._matricesTextureHandle = this._matricesTexture;
		this._matricesTexture = this._modelViewMatricesTexture;
		this.matrixWorld.copy( camera.matrixWorld );

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

		if ( this._modelViewMatricesTexture ) {

			this._modelViewMatricesTexture.dispose();

		}

	}

}
