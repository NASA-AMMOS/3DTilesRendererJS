import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFStructuralMetadataExtension } from './gltf/GLTFStructuralMetadataExtension.js';
import { GLTFMeshFeaturesExtension } from './gltf/GLTFMeshFeaturesExtension.js';
import { GLTFCesiumRTCExtension } from './gltf/GLTFCesiumRTCExtension.js';

/**
 * Plugin for automatically adding common extensions and loaders for 3D Tiles to the
 * `GLTFLoader` used for parsing tile geometry. A `DRACOLoader` can be provided to
 * support loading Draco-compressed point cloud files.
 * @param {Object} [options]
 * @param {boolean} [options.metadata=true] Enable the `EXT_structural_metadata` and `EXT_mesh_features` extensions.
 * @param {boolean} [options.rtc=true] Enable the `CESIUM_RTC` extension.
 * @param {Array} [options.plugins=[]] Additional GLTF loader plugins to pass to `GLTFLoader.register`.
 * @param {Object} [options.dracoLoader=null] A `DRACOLoader` instance for Draco-compressed geometry.
 * @param {Object} [options.ktxLoader=null] A `KTX2Loader` instance for KTX2-compressed textures.
 * @param {Object} [options.meshoptDecoder=null] A `MeshoptDecoder` for Meshopt-compressed meshes.
 * @param {boolean} [options.autoDispose=true] Automatically dispose the DRACO and KTX loaders on `dispose()`.
 */
export class GLTFExtensionsPlugin {

	constructor( options ) {

		options = {
			metadata: true,
			rtc: true,

			plugins: [],

			dracoLoader: null,
			ktxLoader: null,
			meshoptDecoder: null,
			autoDispose: true,
			...options,
		};

		this.tiles = null;

		this.metadata = options.metadata;
		this.rtc = options.rtc;
		this.plugins = options.plugins;

		this.dracoLoader = options.dracoLoader;
		this.ktxLoader = options.ktxLoader;
		this.meshoptDecoder = options.meshoptDecoder;
		this._gltfRegex = /\.(gltf|glb)$/g;
		this._dracoRegex = /\.drc$/g;
		this._loader = null;

	}

	init( tiles ) {

		const loader = new GLTFLoader( tiles.manager );
		if ( this.dracoLoader ) {

			loader.setDRACOLoader( this.dracoLoader );
			tiles.manager.addHandler( this._dracoRegex, this.dracoLoader );

		}

		if ( this.ktxLoader ) {

			loader.setKTX2Loader( this.ktxLoader );

		}

		if ( this.meshoptDecoder ) {

			loader.setMeshoptDecoder( this.meshoptDecoder );

		}

		if ( this.rtc ) {

			loader.register( () => new GLTFCesiumRTCExtension() );

		}

		if ( this.metadata ) {

			loader.register( () => new GLTFStructuralMetadataExtension() );
			loader.register( () => new GLTFMeshFeaturesExtension() );

		}

		this.plugins.forEach( plugin => loader.register( plugin ) );

		tiles.manager.addHandler( this._gltfRegex, loader );
		this.tiles = tiles;
		this._loader = loader;

	}

	dispose() {

		this.tiles.manager.removeHandler( this._gltfRegex );
		this.tiles.manager.removeHandler( this._dracoRegex );
		if ( this.autoDispose ) {

			this.ktxLoader.dispose();
			this.dracoLoader.dispose();

		}

	}

}
