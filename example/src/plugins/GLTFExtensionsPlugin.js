import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFStructuralMetadataExtension, GLTFMeshFeaturesExtension, GLTFCesiumRTCExtension } from '../../../src/index.js';

export class GLTFExtensionsPlugin {

	constructor( options ) {

		options = {
			metadata: true,
			rtc: true,

			plugins: [],

			dracoLoader: null,
			ktxLoader: null,
			autoDispose: true,
			...options,
		};

		this.tiles = null;

		this.metadata = options.metadata;
		this.rtc = options.rtcPlugin;
		this.plugins = options.plugins;

		this.dracoLoader = options.dracoLoader;
		this.ktxLoader = options.ktxLoader;
		this._regex = /(gltf|glb)$/g;
		this._loader = null;

	}

	init( tiles ) {

		const loader = new GLTFLoader( tiles.manager );
		if ( this.dracoLoader ) {

			loader.setDRACOLoader( this.dracoLoader );

		}

		if ( this.ktxLoader ) {

			loader.setKTX2Loader( this.ktxLoader );

		}

		if ( this.rtc ) {

			loader.register( () => new GLTFCesiumRTCExtension() );

		}

		if ( this.metadata ) {

			loader.register( () => new GLTFStructuralMetadataExtension() );
			loader.register( () => new GLTFMeshFeaturesExtension() );

		}

		this.plugins.forEach( plugin => loader.register( plugin ) );

		tiles.manager.setHandler( this._regex, loader );
		this.tiles = tiles;
		this._loader = loader;

	}

	dispose() {

		this.tiles.manager.removeHandler( this._regex );
		if ( this.autoDispose ) {

			this.ktxLoader.dispose();
			this.dracoLoader.dispose();

		}

	}

}
