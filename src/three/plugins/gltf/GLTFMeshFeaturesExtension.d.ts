import { Vector3, BufferGeometry, Texture } from 'three';
import { GLTFLoaderPlugin } from 'three/addons/loaders/GLTFLoader.js';

export class GLTFMeshFeaturesExtension implements GLTFLoaderPlugin {

	name: 'EXT_mesh_features';

}

export interface MeshFeatureInfo {
	label: string | null;
	propertyTable: number | null;
	nullFeatureId: number | null;
	texture?: { index: number, texCoord: number, channels: Array<number> };
}

export class MeshFeatures {

	constructor( geometry: BufferGeometry, textures: Array<Texture | null>, data: any );

	getTextures(): Array<Texture | null>;
	getFeatureInfo(): Array<MeshFeatureInfo>;
	getFeatures( triangle: number, barycoord: Vector3 ): Array<number | null>;
	getFeaturesAsync( triangle: number, barycoord: Vector3 ): Promise<Array<number | null>>;
	dispose(): void;

}
