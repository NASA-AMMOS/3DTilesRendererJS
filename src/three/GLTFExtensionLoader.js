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
			const loader = manager.getHandler( 'path.gltf' ) || manager.getHandler( 'path.glb' ) || new GLTFLoader( manager );

			// GLTFLoader assumes the working path ends in a slash
			let workingPath = this.workingPath;
			if ( ! /[\\/]$/.test( workingPath ) ) {

				workingPath += '/';

			}

			loader.parse( buffer, workingPath, model => {

				resolve( model );

			}, reject );

		} );

	}

}
