import { Camera, Group } from 'three';
import { MVTIconGlyphs } from './MVTIconGlyphs.js';
import { MVTLabelGlyphs } from './MVTLabelGlyphs.js';

export class MVTAnnotationsDriver {

	group: Group;

	filterAnnotation( layer: string, properties: Record<string, unknown>, type: number ): boolean;
	sortAnnotations( a: object, b: object ): number;
	measureChar( char: string ): number;
	getText( properties: Record<string, unknown> ): string;
	isAnnotationEnabled( layer: string, properties: Record<string, unknown>, type: number ): boolean;
	onPointsUpdate( added: object[], removed: object[] ): void;
	onLabelsUpdate( added: object[], removed: object[] ): void;
	dispose(): void;

}

export class DefaultMVTAnnotationsDriver extends MVTAnnotationsDriver {

	icons: MVTIconGlyphs;
	labels: MVTLabelGlyphs;

}

export interface MVTAnnotationsPluginOptions {

	overlay: object;
	camera?: Camera | null;
	driver?: MVTAnnotationsDriver;
	resolution?: number | null;

}

export class MVTAnnotationsPlugin {

	name: string;
	priority: number;

	overlay: object;
	camera: Camera | null;
	driver: MVTAnnotationsDriver;
	resolution: number | null;

	readonly contentCache: object;

	constructor( options: MVTAnnotationsPluginOptions );

	init( tiles: object ): Promise<void>;
	dispose(): void;

}
