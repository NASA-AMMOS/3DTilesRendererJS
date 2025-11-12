import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class GLTFExtensionsPlugin {

	constructor( options: {
		metadata?: boolean,
		rtc?: boolean,

		plugins?: Array<( parser: GLTFParser ) => GLTFLoaderPlugin>,

		dracoLoader?: DRACOLoader | null,
		ktxLoader?: KTX2Loader | null,
		meshoptDecoder?: typeof MeshoptDecoder | null,
		autoDispose?: boolean,
	} );

}
