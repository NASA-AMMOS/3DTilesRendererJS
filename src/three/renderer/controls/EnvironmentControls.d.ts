import { Camera, EventDispatcher, Object3D, Plane, Vector3 } from 'three';

export interface EnvironmentControlsEventMap {
	'change': {};
	'start': {};
	'end': {};
}

export class EnvironmentControls extends EventDispatcher<EnvironmentControlsEventMap> {

	readonly isEnvironmentControls: true;

	readonly domElement: HTMLElement;
	readonly camera: Camera;
	readonly scene: Object3D;

	// settings
	enabled: boolean;
	cameraRadius: number;
	rotationSpeed: number;
	minAltitude: number;
	maxAltitude: number;
	minDistance: number;
	maxDistance: number;
	minZoom: number;
	maxZoom: number;
	zoomSpeed: number;
	adjustHeight: boolean;
	enableDamping: boolean;
	dampingFactor: number;
	useFallbackPlane: boolean;

	fallbackPlane: Plane;
	up: Vector3;

	// flight
	enableFlight: boolean;
	flightSpeed: number;
	flightSpeedMultiplier: number;

	constructor(
		scene?: Object3D,
		camera?: Camera,
		domElement?: HTMLElement,
	);

	setScene ( scene: Object3D | null ): void;
	setCamera ( camera: Camera | null ): void;

	attach( domElement: HTMLElement ): void;
	detach(): void;

	setState( state?: number, fireEvent?: boolean ): void;
	resetState(): void;

	update( deltaTime?: number ): void;

	adjustCamera( camera: Camera ): void;

	getUpDirection( point: Vector3, target: Vector3 ): void;
	getCameraUpDirection( target: Vector3 ): void;
	getPivotPoint ( target: Vector3 ): void;

	dispose(): void;

}
