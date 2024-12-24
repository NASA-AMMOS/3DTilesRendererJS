import { Vector3, Texture } from 'three';
import { GLTFLoaderPlugin } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class GLTFStructuralMetadataExtension implements GLTFLoaderPlugin {

	name: 'EXT_structural_metadata';

}

class StructuralMetadata {

	textures: Array<Texture | null>;

	getPropertyTableData( tableIndices: Array<number>, ids: Array<number>, target: Array = [] ): Array<any>;
	getPropertyTableInfo( tableIndices: Array<number> | null = null ): Array<{ name: string, className: string }>;

	getPropertyTextureData( triangle: number, barycoord: Vector3, target: Array = [] ): Array<any>;
	getPropertyTextureDataAsync( triangle: number, barycoord: Vector3, target: Array = [] ): Promise<Array<any>>;
	getPropertyTextureInfo(): Array<{
		name: string,
		className: string,
		properties: {
			[key: string]: {
				index: number,
				texCoord: number,
				channels: Array<number>,
			}
		}
	}>;

	getPropertyAttributeData( attributeIndex: number, target: Array = [] ): Array<any>;
	getPropertyAttributeInfo(): Array<{ name: string, className: string }>;

	dispose(): void;

}

declare module 'three' {

	export interface Object3D {

		userData: {

			structuralMetadata?: StructuralMetadata;

		}

	}

}
