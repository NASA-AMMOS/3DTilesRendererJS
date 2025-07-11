import { Tile } from '../../core/renderer/tiles/Tile.js';
import { Color } from 'three';

export enum ColorMode {}
export const NONE : ColorMode;
export const SCREEN_ERROR : ColorMode;
export const GEOMETRIC_ERROR : ColorMode;
export const DISTANCE : ColorMode;
export const DEPTH : ColorMode;
export const RELATIVE_DEPTH : ColorMode;
export const IS_LEAF : ColorMode;
export const RANDOM_COLOR : ColorMode;
export const RANDOM_NODE_COLOR: ColorMode;
export const CUSTOM_COLOR: ColorMode;

export class DebugTilesPlugin {

	constructor( options?: {
		displayParentBounds?: boolean,
		displayBoxBounds?: boolean,
		displaySphereBounds?: boolean,
		displayRegionBounds?: boolean,
		colorMode?: ColorMode,
		maxDebugDepth?: number,
		maxDebugDistance?: number,
		maxDebugError?: number,
		customColorCallback?: ( val: Tile, target: Color ) => void,
		unlit?: boolean,
		enabled?: boolean,
	} );

	static ColorModes: typeof ColorMode;

	enabled: boolean;

	displayBoxBounds : boolean;
	displaySphereBounds : boolean;
	displayRegionBounds : boolean;
	colorMode : ColorMode;
	unlit: boolean;
	maxDebugDepth : number;
	maxDebugDistance : number;
	maxDebugError : number;

	getDebugColor : ( val: number, target: Color ) => void;
	customColorCallback : ( val: Tile, target: Color ) => void;

}
