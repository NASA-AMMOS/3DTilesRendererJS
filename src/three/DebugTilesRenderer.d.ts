import { TilesRenderer } from './TilesRenderer';
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
export class DebugTilesRenderer extends TilesRenderer {

	displayBoxBounds : Boolean;
	displaySphereBounds : Boolean;
	colorMode : ColorMode;
	
	/** Debug color min value, default 'black' */
	minDebugColor : Color;
	/** Debug color max value, default 'white' */
	maxDebugColor : Color;

	maxDebugDepth : Number;
	maxDebugDistance : Number;
	maxDebugError : Number;

}
