import { Vector3 } from 'three';

export class GLTFMeshFeaturesExtension {

	name: 'EXT_mesh_features';

}

export class MeshFeatures {

	getFeatures( triangle: number, barycoord: Vector3 ): Array<number>;
	getFeaturesAsync( triangle: number, barycoord: Vector3 ): Promise<Array<number>>;
	getFeaturesInfo(): Array<{ label: string, propertyTable: number, nullFeatureId: number | null }>;
	dispose(): void;

}

declare module 'three' {

	export interface Object3D {

		userData: {

			meshFeatures?: MeshFeatures;

		}

	}

}
