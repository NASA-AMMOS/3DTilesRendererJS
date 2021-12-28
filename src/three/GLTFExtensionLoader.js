import { DefaultLoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoaderBase } from '../base/LoaderBase.js';

export class GLTFExtensionLoader extends LoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		return new Promise( ( resolve, reject ) => {

			const manager = this.manager;
			let loader = manager.getHandler( 'path.gltf' ) || manager.getHandler( 'path.glb' );

			if ( ! loader ) {

				loader = new GLTFLoader( manager );
				loader.crossOrigin = this.crossOrigin;
				loader.withCredentials = this.withCredentials;

			}

			// assume any pre-registered loader has paths configured as the user desires, but if we're making
			// a new loader, use the working path during parse to support relative uris on other hosts
			const resourcePath = loader.resourcePath || loader.path || this.workingPath;

			loader.parse( buffer, resourcePath, model => {

				resolve( model );

			}, reject );

		} );

	}

}
