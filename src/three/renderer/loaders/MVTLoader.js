import { MVTLoaderBase } from '3d-tiles-renderer/core';
import { DefaultLoadingManager } from 'three';
import { VectorTileStyler } from '../utils/VectorTileStyler.js';
import { VectorTileMeshRenderer } from '../utils/VectorTileMeshRenderer.js';

export class MVTLoader extends MVTLoaderBase {

	constructor( manager = DefaultLoadingManager, styles = {} ) {

		super();
		this.manager = manager;

		// Use composed styler and renderer
		this._styler = new VectorTileStyler( { styles } );
		this._renderer = new VectorTileMeshRenderer( this._styler );

		// Expose default materials from renderer for backward compatibility
		this.defaultPointsMaterial = this._renderer.defaultPointsMaterial;
		this.defaultLineMaterial = this._renderer.defaultLineMaterial;
		this.defaultMeshMaterial = this._renderer.defaultMeshMaterial;

	}

	// Legacy API: expose filter for backward compatibility
	get filter() {

		return this._styler.filter;

	}

	set filter( fn ) {

		this._styler.filter = fn;

	}

	parse( buffer ) {

		return super.parse( buffer ).then( result => {

			result.scene = this._renderer.render( result.vectorTile );
			return result;

		} );

	}

}
