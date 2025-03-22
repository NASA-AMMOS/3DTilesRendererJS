import { Mesh } from 'three';

export class TileFatteningPlugin {

	hasShape( mesh: Mesh ): boolean;
	addShape( mesh: Mesh, direction: Vector3 ): void;
	updateShape( mesh: Mesh ): void;
	deleteShape( mesh ): boolean;
	clearShapes(): void;

}
