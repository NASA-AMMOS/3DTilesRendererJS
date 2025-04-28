import { B3DMBaseResult } from '../../base/loaders/B3DMLoaderBase.js';
import { BatchTable } from '../../utilities/BatchTable.js';
import { FeatureTable } from '../../utilities/FeatureTable.js';
import { LoadingManager, Group } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface B3DMScene extends Group {

	batchTable : BatchTable;
	featureTable : FeatureTable;

}

export interface B3DMResult extends GLTF, B3DMBaseResult {

	scene : B3DMScene;

}

export class B3DMLoader {

	constructor( manager : LoadingManager );
	load( url : string ) : Promise< B3DMResult >;
	parse( buffer : ArrayBuffer ) : Promise < B3DMResult >;

}
