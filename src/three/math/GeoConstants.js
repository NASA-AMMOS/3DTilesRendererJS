import { WGS84_RADIUS, WGS84_HEIGHT, LUNAR_RADIUS, LUNAR_HEIGHT } from '../../base/constants.js';
import { Ellipsoid } from './Ellipsoid.js';

export const WGS84_ELLIPSOID = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
export const LUNAR_ELLIPSOID = new Ellipsoid( LUNAR_RADIUS, LUNAR_RADIUS, LUNAR_HEIGHT );
