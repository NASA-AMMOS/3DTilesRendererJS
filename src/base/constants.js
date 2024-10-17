// FAILED is negative so lru cache priority sorting will unload it first
export const FAILED = - 1;
export const UNLOADED = 0;
export const LOADING = 1;
export const PARSING = 2;
export const LOADED = 3;

// https://en.wikipedia.org/wiki/World_Geodetic_System
// https://en.wikipedia.org/wiki/Flattening
export const WGS84_RADIUS = 6378137;
export const WGS84_FLATTENING = 1 / 298.257223563;
export const WGS84_HEIGHT = - ( WGS84_FLATTENING * WGS84_RADIUS - WGS84_RADIUS );

// https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
export const LUNAR_HEIGHT = 1736.0 * 1e3;
export const LUNAR_RADIUS = 1738.1 * 1e3;
