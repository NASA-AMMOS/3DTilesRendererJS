import { Matrix4, Box3 } from 'three';

export class OBB {

	constructor( box = new Box3(), transform = new Matrix4() ) {

		this.box = box.clone();
		this.transform = transform.clone();
		this.inverseTransform = new Matrix4();

	}

	update() {

		this.inverseTransform.copy( this.transform ).invert();

	}

}
