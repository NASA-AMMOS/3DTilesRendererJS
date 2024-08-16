import { Matrix4 } from 'three';

const _matrix = new Matrix4();
export class UpdateOnChangePlugin {

	constructor() {

		this.tiles = null;
		this.needsUpdate = false;
		this.cameraMatrices = new Map();

	}

	init( tiles ) {

		this.tiles = tiles;

		this._onLoadContent = () => this.needsUpdate = true;
		this._onCameraAdd = ( { camera } ) => {

			this.needsUpdate = true;
			this.cameraMatrices.set( camera, new Matrix4() );

		};
		this._onCameraDelete = ( { camera } ) => {

			this.needsUpdate = true;
			this.cameraMatrices.delete( camera );

		};
		this._onCameraResolutionChange = () => this.needsUpdate = true;

		tiles.addEventListener( 'load-content', this._onLoadContent );
		tiles.addEventListener( 'add-camera', this._onCameraAdd );
		tiles.addEventListener( 'delete-camera', this._onCameraDelete );
		tiles.addEventListener( 'camera-resolution-change', this._onCameraResolutionChange );

	}

	doTilesNeedUpdate() {

		const tiles = this.tiles;
		let didCamerasChange = false;
		this.cameraMatrices.forEach( ( matrix, camera ) => {

			_matrix
				.copy( tiles.group.matrixWorld )
				.premultiply( camera.matrixWorldInverse )
				.premultiply( camera.projectionMatrixInverse );

			didCamerasChange = didCamerasChange || ! _matrix.equals( matrix );
			matrix.copy( _matrix );

		} );

		const needsUpdate = this.needsUpdate;
		this.needsUpdate = false;

		return needsUpdate || didCamerasChange;

	}

	dispose() {

		const tiles = this.tiles;
		tiles.removeEventListener( 'content-load', this._onLoadContent );
		tiles.removeEventListener( 'camera-add', this._onCameraAdd );
		tiles.removeEventListener( 'camera-delete', this._onCameraDelete );
		tiles.removeEventListener( 'camera-resolution-change', this._onCameraResolutionChange );

	}

}
