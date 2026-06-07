import { Camera, Vector3 } from 'three';

export type GetAnnotationCallback = ( layerName: string, properties: Record<string, unknown> ) => boolean;

export type SortAnnotationCallback = ( a: PointAnnotationItem, b: PointAnnotationItem ) => number;

export type AnnotationsUpdateCallback = ( added: Set<PointAnnotationItem>, removed: Set<PointAnnotationItem> ) => void;

export class AnnotationItem {

	layer: string;
	properties: Record<string, unknown> | null;

}

export class PointAnnotationItem extends AnnotationItem {

	position: Vector3;
	lat: number;
	lon: number;
	radius: number;

}

export interface MVTAnnotationsPluginOptions {

	overlay: object;
	camera?: Camera | null;
	sortCallback?: SortAnnotationCallback;
	filterAnnotation?: GetAnnotationCallback | null;
	onAnnotationsUpdate?: AnnotationsUpdateCallback;
	displayOccupancyGrid?: boolean;

}

export class MVTAnnotationsPlugin {

	name: string;
	priority: number;

	overlay: object;
	camera: Camera | null;

	filterAnnotation: GetAnnotationCallback | null;
	onAnnotationsUpdate: AnnotationsUpdateCallback;

	displayOccupancyGrid: boolean;
	maxSettleTimeMs: number;

	constructor( options: MVTAnnotationsPluginOptions );

}
