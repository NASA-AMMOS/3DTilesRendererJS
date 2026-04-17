import { WGS84_RADIUS, WGS84_HEIGHT } from '3d-tiles-renderer/core';
import { Ellipsoid } from './Ellipsoid.js';

/**
 * Ellipsoid instance representing the WGS84 reference ellipsoid used to model the Earth.
 * @type {Ellipsoid}
 * @ignore
 */
export const WGS84_ELLIPSOID = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
WGS84_ELLIPSOID.name = 'WGS84 Earth';
