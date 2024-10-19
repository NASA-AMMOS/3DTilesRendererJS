import { BatchedMesh, Matrix4, Vector3, Source } from 'three';

const matrix = new Matrix4();
const vec1 = new Vector3();
const vec2 = new Vector3();
export class ModelViewBatchedMesh extends BatchedMesh {

	constructor( ...args ) {

		super( ...args );

		this.resetDistance = 1e4;
		this._initMatricesTexture();
		this._matricesTextureHandle = null;
		this._lastCameraPos = new Matrix4();
		this._forceUpdate = true;

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

	setMatrixAt( ...args ) {

		super.setMatrixAt( ...args );
		this._forceUpdate = true;

	}

	onBeforeRender( renderer, scene, camera, geometry, material, group ) {

		super.onBeforeRender( renderer, scene, camera, geometry, material, group );

		vec1.setFromMatrixPosition( camera.matrixWorld );
		vec2.setFromMatrixPosition( this._lastCameraPos );

		if ( this._forceUpdate || vec1.distanceTo( vec2 ) > this.resetDistance ) {

			// TODO: resize and re-instantiate the texture here if the size is different
			const matricesArray = this._matricesTexture.image.data;
			const modelViewArray = this._modelViewMatricesTexture.image.data;
			for ( let i = 0; i < this.instanceCount; i ++ ) {

				matrix
					.fromArray( matricesArray, i * 16 )
					.premultiply( this.matrixWorld )
					.premultiply( camera.matrixWorldInverse )
					.toArray( modelViewArray, i * 16 );

			}

			this._modelViewMatricesTexture.needsUpdate = true;
			this._lastCameraPos.copy( camera.matrixWorld );
			this._forceUpdate = false;

		}

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

		if ( this._modelViewMatricesTexture ) {

			this._modelViewMatricesTexture.dispose();

		}

	}

}
