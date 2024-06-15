import { Vector3 } from 'three';

export class GLTFStructuralMetadataExtension {

	name: 'EXT_structural_metadata';

}

class StructuralMetadata {

	getPropertyTableData( tableIndices: Array<Number>, ids: Array<Number>, target: Array = [] ): Array<any>;
	getPropertyTableInfo( tableIndices: Array<Number> | null = null ): Array<{ name: String, className: string }>;

	getPropertyTextureData( triangle: Number, barycoord: Vector3, target: Array = [] ): Array<any>;
	getPropertyTextureDataAsync( triangle: Number, barycoord: Vector3, target: Array = [] ): Promise<Array<any>>;
	getPropertyTextureInfo(): Array<{ name: String, className: string }>;

	getPropertyAttributeData( attributeIndex: Number, target: Array = [] ): Array<any>;
	getPropertyAttributeInfo(): Array<{ name: String, className: string }>;

}

declare module 'three' {

	export interface Object3D {

		userData: {

			structuralMetadata?: StructuralMetadata;

		}

	}

}
