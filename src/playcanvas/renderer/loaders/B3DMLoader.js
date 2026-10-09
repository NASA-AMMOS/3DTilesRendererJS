/** @import { AppBase } from 'playcanvas' */
import { B3DMLoaderBase } from '3d-tiles-renderer/core';
import { GLTFLoader } from './GLTFLoader.js';

/**
 * PlayCanvas loader for B3DM (Batched 3D Model) tile content. Parses the B3DM header and tables
 * and loads the embedded GLB with {@link GLTFLoader}.
 * @extends B3DMLoaderBase
 */
export class B3DMLoader extends B3DMLoaderBase {

	/**
	 * @param {AppBase} app - The PlayCanvas application.
	 */
	constructor( app ) {

		super();

		/**
		 * The PlayCanvas application the content is created for.
		 * @type {AppBase}
		 */
		this.app = app;

		/**
		 * Options passed to the `container` asset, such as glTF parser callbacks.
		 * @type {Object|null}
		 */
		this.assetOptions = null;

		/**
		 * Options passed to the render components created for the content, such as `castShadows`.
		 * @type {Object|null}
		 */
		this.renderOptions = null;

	}

	/**
	 * @param {ArrayBuffer} buffer - The raw B3DM file data.
	 * @param {string} url - The URL of the content, used to resolve relative resources.
	 * @returns {Promise<Object>} The loaded model as returned by {@link GLTFLoader#parse}, plus the
	 * B3DM batch and feature tables, and the `RTC_CENTER` offset if the feature table has one.
	 */
	async parse( buffer, url ) {

		const b3dm = super.parse( buffer );

		const gltfLoader = new GLTFLoader( this.app );
		gltfLoader.workingPath = this.workingPath;
		gltfLoader.fetchOptions = this.fetchOptions;
		gltfLoader.assetOptions = this.assetOptions;
		gltfLoader.renderOptions = this.renderOptions;

		// the GLB is a view into the B3DM buffer, the engine expects a buffer of its own
		const { batchTable, featureTable } = b3dm;
		const result = await gltfLoader.parse( b3dm.glbBytes.slice().buffer, url );
		return {
			...result,
			batchTable,
			featureTable,
			rtcCenter: featureTable.getData( 'RTC_CENTER', 1, 'FLOAT', 'VEC3' ),
		};

	}

}
