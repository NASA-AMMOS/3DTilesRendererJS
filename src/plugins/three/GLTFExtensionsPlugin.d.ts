import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader';

export class GLTFExtensionsPlugin {

	constructor( options: {
		metadata?: boolean,
		rtc?: boolean,

		plugins?: Array<( parser: GLTFParser ) => GLTFLoaderPlugin>,

		dracoLoader?: DRACOLoader | null,
		ktxLoader?: KTX2Loader | null,
		autoDispose?: boolean,
	} );

}
