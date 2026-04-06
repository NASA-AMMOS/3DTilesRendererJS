import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoaderPlugin, GLTFParser } from 'three/addons/loaders/GLTFLoader.js';

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
