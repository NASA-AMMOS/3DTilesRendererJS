import { Matrix4, Vector3 } from 'three';

const NONE = 0;
const ZOOM = 1;
const DRAG = 2;
const ROTATE = 3;

// TODO
// - zoom in to cursor
// - rotate around clicked point
// - click and drag enables cursor to remain under the mouse
// - when adjusting the camera based on terrain we rotate around the drag position
// - support both globe and flat terrain
// - support acceleration?
// - small world rotation pivots the camera frame. camera must retain direction and only pivot on the right axis
// - translation moves on a plane below the camera
export class GlobeControls {

	constructor( camera, domElement ) {

		this.raycastEnvironment = null;
		this.spherecastEnvironment = null;
		this.state = NONE;
		this.pivot = new Vector3();
		this.frame = new Matrix4();

	}

	attach( domElement ) {

	}

	detach( ) {

	}

	updateZoom( scale ) {

		// TODO: zoom to pivot

	}

	updatePosition() {

	}

	updateRotation() {

	}

	update() {



	}

}
