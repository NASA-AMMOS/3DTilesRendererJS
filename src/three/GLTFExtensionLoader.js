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
			const fetchOptions = this.fetchOptions;
			let loader = manager.getHandler( 'path.gltf' ) || manager.getHandler( 'path.glb' );

			if ( ! loader ) {

				loader = new GLTFLoader( manager );
				if ( fetchOptions.credentials === 'include' && fetchOptions.mode === 'cors' ) {

					loader.setCrossOrigin( 'use-credentials' );

				}

				if ( 'credentials' in fetchOptions ) {

					loader.setWithCredentials( fetchOptions.credentials === 'include' );

				}

				if ( fetchOptions.headers ) {

					loader.setRequestHeader( fetchOptions.headers );

				}

			}

			// assume any pre-registered loader has paths configured as the user desires, but if we're making
			// a new loader, use the working path during parse to support relative uris on other hosts
			let resourcePath = loader.resourcePath || loader.path || this.workingPath;
			if ( ! /[\\/]$/.test( resourcePath ) && resourcePath.length ) {

				resourcePath += '/';

			}

			loader.parse( buffer, resourcePath, model => {

				resolve( model );

			}, reject );

		} );

	}

}
