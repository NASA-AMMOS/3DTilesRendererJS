/** @import { AppBase, AssetRegistry, Entity } from 'playcanvas' */
import { Asset } from 'playcanvas';
import { LoaderBase } from '3d-tiles-renderer/core';

let _loadId = 0;

/**
 * PlayCanvas loader for GLTF and GLB tile content. The already downloaded buffer is passed to the
 * engine as the contents of a `container` asset, so the engine's glTF parser and extensions are
 * used without fetching the file again.
 * @extends LoaderBase
 */
export class GLTFLoader extends LoaderBase {

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
	 * @param {ArrayBuffer} buffer - The raw GLTF or GLB file data.
	 * @param {string} url - The URL of the content, used to resolve relative resources.
	 * @returns {Promise<{ scene: Entity, container: Asset, gltf: Object, asset: Object }>} The
	 * entity created for the content, the `container` asset it was loaded from, the glTF JSON, and
	 * its `asset` property, which holds the copyright of the content.
	 */
	async parse( buffer, url ) {

		const { app, assetOptions, renderOptions } = this;
		const registry = app.assets;

		// The resource loader caches and de-duplicates requests by URL, and the registry indexes
		// assets by URL, so every load gets a unique one. A fragment keeps relative resources
		// resolving against the tile URL. Relative URLs are made absolute so a registry prefix is
		// not applied to them.
		const id = _loadId ++;
		const absoluteUrl = typeof location !== 'undefined' ? new URL( url, location.href ).href : url;
		const uniqueUrl = `${ absoluteUrl.split( '#' )[ 0 ] }#tile-${ id }`;

		const asset = new Asset( `tile-${ id }`, 'container', { url: uniqueUrl, contents: buffer }, null, assetOptions );
		registry.add( asset );

		try {

			await new Promise( ( resolve, reject ) => {

				asset.once( 'load', resolve );
				asset.once( 'error', reject );
				registry.load( asset );

			} );

		} catch ( error ) {

			disposeModel( null, asset, registry );
			throw error;

		}

		const resource = asset.resource;
		const gltf = resource.data.gltf;
		return {
			scene: resource.instantiateRenderEntity( renderOptions ?? undefined ),
			container: asset,
			gltf,
			asset: gltf.asset || {},
		};

	}

}

/**
 * Releases the entity and every engine resource created for a loaded model.
 * @param {Entity|null} scene - The entity created for the model.
 * @param {Asset} asset - The `container` asset the model was loaded from.
 * @param {AssetRegistry} registry - The registry the asset was added to.
 */
export function disposeModel( scene, asset, registry ) {

	// destroy the entity first so its render components release their mesh instances, then unload
	// the asset, which destroys the textures, materials and meshes and clears the loader cache entry
	if ( scene ) {

		scene.destroy();

	}

	asset.unload();
	registry.remove( asset );

}
