import { Camera, Scene, Vector3 } from 'three';

export type GetAnnotationCallback = ( layerName: string, properties: Record<string, unknown> ) => boolean;

export type AnnotationsUpdateCallback = ( added: Set<PointAnnotationItem>, removed: Set<PointAnnotationItem> ) => void;

export class AnnotationItem {

	id: string;
	layer: string;
	properties: Record<string, unknown> | null;
	ready: boolean;
	lodLevel: number;
	firstShownTime: number;

}

export class PointAnnotationItem extends AnnotationItem {

	position: Vector3;
	lat: number;
	lon: number;
	radius: number;
	depth: number;

}

export interface MVTAnnotationsPluginOptions {

	overlay: object;
	camera?: Camera | null;
	scene?: Scene | null;
	getAnnotation?: GetAnnotationCallback | null;
	onAnnotationsUpdate?: AnnotationsUpdateCallback;
	displayOccupancyGrid?: boolean;

}

export class MVTAnnotationsPlugin {

	name: string;
	priority: number;

	overlay: object;
	camera: Camera | null;
	scene: Scene | null;

	getAnnotation: GetAnnotationCallback | null;
	onAnnotationsUpdate: AnnotationsUpdateCallback;

	displayOccupancyGrid: boolean;
	maxRaycastTimeMs: number;

	constructor( options: MVTAnnotationsPluginOptions );

	setCamera( camera: Camera ): void;

}
