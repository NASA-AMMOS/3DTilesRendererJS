import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFStructuralMetadataExtension } from './gltf/GLTFStructuralMetadataExtension.js';
import { GLTFMeshFeaturesExtension } from './gltf/GLTFMeshFeaturesExtension.js';
import { GLTFCesiumRTCExtension } from './gltf/GLTFCesiumRTCExtension.js';

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
