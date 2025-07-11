import { EventDispatcher, OrthographicCamera, PerspectiveCamera } from 'three';

export class CameraTransitionManager extends EventDispatcher {

	get animating(): boolean;
	get camera(): PerspectiveCamera | OrthographicCamera;

	get mode(): 'perspective' | 'orthographic';
	set mode( v: 'perspective' | 'orthographic' );

	constructor( perspectiveCamera?: PerspectiveCamera, orthographicCamera?: OrthographicCamera );

	toggle(): void;
	update(): void;

	syncCameras(): void;

}
