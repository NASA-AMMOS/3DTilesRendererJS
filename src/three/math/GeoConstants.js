import { WGS84_RADIUS, WGS84_HEIGHT, MOON_RADIUS, MOON_HEIGHT } from '../../base/constants.js';
import { Ellipsoid } from './Ellipsoid.js';

export const WGS84_ELLIPSOID = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
export const MOON_ELLIPSOID = new Ellipsoid( MOON_RADIUS, MOON_RADIUS, MOON_HEIGHT );
