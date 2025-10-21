import { EventDispatcher, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

export interface CameraTransitionManagerEventMap {
	'camera-change': { camera: PerspectiveCamera | OrthographicCamera; prevCamera: PerspectiveCamera | OrthographicCamera };
	'transition-start': {};
	'transition-end': {};
	'toggle': {};
	'change': { alpha: number };
}

export class CameraTransitionManager extends EventDispatcher<CameraTransitionManagerEventMap> {

	get animating(): boolean;
	get alpha(): number;
	get camera(): PerspectiveCamera | OrthographicCamera;

	get mode(): 'perspective' | 'orthographic';
	set mode( v: 'perspective' | 'orthographic' );

	// settings
	fixedPoint: Vector3;
	duration: number;
	autoSync: boolean;
	orthographicPositionalZoom: boolean;
	orthographicOffset: number;
	easeFunction: ( x: number ) => number;

	// cameras
	perspectiveCamera: PerspectiveCamera;
	orthographicCamera: OrthographicCamera;
	transitionCamera: PerspectiveCamera;

	constructor( perspectiveCamera?: PerspectiveCamera, orthographicCamera?: OrthographicCamera );

	toggle(): void;
	update( deltaTime?: number ): void;

	syncCameras(): void;

}
