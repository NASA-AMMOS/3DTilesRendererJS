import { Vector3 } from 'three';

export class GLTFMeshFeaturesExtension {

	name: 'EXT_mesh_features';

}

export class MeshFeatures {

	getFeatures( triangle: Number, barycoord: Vector3 ): Array<Number>;
	getFeaturesAsync( triangle: Number, barycoord: Vector3 ): Promise<Array<Number>>;
	getFeaturesInfo(): Array<{ label: String, propertyTable: Number, nullFeatureId: Number | null }>;
	dispose(): void;

}

declare module 'three' {

	export interface Object3D {

		userData: {

			meshFeatures?: MeshFeatures;

		}

	}

}
