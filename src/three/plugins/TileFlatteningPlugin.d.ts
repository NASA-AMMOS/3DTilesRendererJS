import { Mesh, Vector3 } from 'three';

export class TileFlatteningPlugin {

	hasShape( mesh: Mesh ): boolean;
	addShape( mesh: Mesh, direction: Vector3, threshold: number ): void;
	updateShape( mesh: Mesh ): void;
	deleteShape( mesh: Mesh ): boolean;
	clearShapes(): void;

}
