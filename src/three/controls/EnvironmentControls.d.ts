import { Camera, EventDispatcher, Object3D, Vector3 } from 'three';
import { TilesRenderer } from '../TilesRenderer';

export interface EnvironmentControlsEventMap {
	'change': {};
	'start': {};
	'end': {};
}

export class EnvironmentControls extends EventDispatcher<EnvironmentControlsEventMap> {

	readonly isEnvironmentControls: true;

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

	pivotPoint: Vector3;

	constructor(
		scene?: Object3D,
		camera?: Camera,
		domElement?: HTMLElement,
		tilesRenderer?: TilesRenderer,
	);

	setScene ( scene: Object3D ): void;
	setCamera ( camera: Camera ): void;
	setTilesRenderer( tilesRenderer: TilesRenderer ): void;

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
