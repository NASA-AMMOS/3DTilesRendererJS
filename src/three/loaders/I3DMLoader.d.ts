import { I3DMBaseResult } from '../../base/loaders/I3DMLoaderBase.js';
import { BatchTable } from '../../utilities/BatchTable.js';
import { FeatureTable } from '../../utilities/FeatureTable.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, LoadingManager } from 'three';

interface I3DMScene extends Group {

	batchTable : BatchTable;
	featureTable : FeatureTable;

}

export interface I3DMResult extends GLTF, I3DMBaseResult {

	scene : I3DMScene;

}

export class I3DMLoader {

	constructor( manager : LoadingManager );
	load( url : string ) : Promise< I3DMResult >;
	parse( buffer : ArrayBuffer ) : Promise< I3DMResult >;

}
