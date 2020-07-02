import { B3DMBaseResult } from '../base/B3DMLoaderBase';
import { LoadingManager } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export interface B3DMResult extends GLTF, B3DMBaseResult {}

export class B3DMLoader {

	constructor( manager : LoadingManager );
	load( url : String ) : Promise< B3DMResult >;
	parse( buffer : ArrayBuffer ) : B3DMResult;

}
