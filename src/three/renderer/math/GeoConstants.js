import { WGS84_RADIUS, WGS84_HEIGHT } from '3d-tiles-renderer/core';
import { Ellipsoid } from './Ellipsoid.js';

export const WGS84_ELLIPSOID = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
WGS84_ELLIPSOID.name = 'WGS84 Earth';
