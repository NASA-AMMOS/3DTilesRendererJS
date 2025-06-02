import { Tile } from '../../base/Tile.js';
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
export const UNLIT: ColorMode;
export class DebugTilesPlugin {

	static ColorModes: typeof ColorMode;

	enabled: boolean;

	displayBoxBounds : boolean;
	displaySphereBounds : boolean;
	displayRegionBounds : boolean;
	colorMode : ColorMode;
	maxDebugDepth : number;
	maxDebugDistance : number;
	maxDebugError : number;

	getDebugColor : ( val: number, target: Color ) => void;
	customColorCallback : ( val: Tile, target: Color ) => void;

}
