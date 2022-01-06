import { B3DMBaseResult } from '../base/B3DMLoaderBase';
import { FeatureTable, BatchTable } from '../utilities/FeatureTable';
import { LoadingManager, Group } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

interface B3DMScene extends Group {
	
	batchTable : BatchTable;
	featureTable : FeatureTable;

}

export interface B3DMResult extends GLTF, B3DMBaseResult {

	scene : B3DMScene;
	
}

export class B3DMLoader {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< B3DMResult >;
	parse( buffer : ArrayBuffer ) : Promise < B3DMResult >;

}
