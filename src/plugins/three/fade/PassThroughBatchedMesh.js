import { BatchedMesh, MeshBasicMaterial } from 'three';

// NOTE this will not automatically delete instances on geometry delete.
export class PassThroughBatchedMesh extends BatchedMesh {

	get geometry() {

		return this.other.geometry;

	}

	constructor( maxInstanceCount, other, material = new MeshBasicMaterial() ) {

		super( maxInstanceCount, 0, 0, material );
		this.other = other;

	}

}
