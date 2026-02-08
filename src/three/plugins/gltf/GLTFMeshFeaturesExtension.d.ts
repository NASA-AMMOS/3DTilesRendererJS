import { Vector3, BufferGeometry, Texture } from 'three';
import { GLTFLoaderPlugin } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class GLTFMeshFeaturesExtension implements GLTFLoaderPlugin {

	name: 'EXT_mesh_features';

}

export class MeshFeatures {

	constructor( geometry: BufferGeometry, textures: Array<Texture | null>, data: any );

	getFeatures( triangle: number, barycoord: Vector3 ): Array<number>;
	getFeaturesAsync( triangle: number, barycoord: Vector3 ): Promise<Array<number>>;
	getFeaturesInfo(): Array<{ label: string, propertyTable: number, nullFeatureId: number | null }>;
	dispose(): void;

}
