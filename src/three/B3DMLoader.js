import { B3DMLoaderBase } from '../base/B3DMLoaderBase.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class B3DMLoader extends B3DMLoaderBase {

	constructor( manager ) {

		super();
		this.manager = manager;
		this.ktx2Loader = null;
		this.dracoLoader = null;
		this.ddsLoader = null;

	}
	
	setKTX2Loader( loader ) {

		this.ktx2Loader = loader;

	}
	
	setDracoLoader( loader ) {

		this.dracoLoader = loader;

	}
	
	setDDSLoader( loader ) {

		this.ddsLoader = loader;

	}

	parse( buffer ) {

		const b3dm = super.parse( buffer );
		const gltfBuffer = b3dm.glbBytes.slice().buffer;
		return new Promise( ( resolve, reject ) => {

			const manager = this.manager;
			const loader = new GLTFLoader( manager );
			loader.setKTX2Loader( this.ktx2Loader );
			loader.setDracoLoader( this.dracoLoader );
			loader.setDDSLoader( this.ddsLoader );
			loader.parse( gltfBuffer, null, model => {

				model.batchTable = b3dm.batchTable;
				model.featureTable = b3dm.featureTable;
				resolve( model );

			}, reject );

		} );

	}

}
