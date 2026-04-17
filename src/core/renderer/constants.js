/**
 * Tile content failed to load. Sorted first for eviction by the LRU cache.
 * @type {number}
 */
export const FAILED = - 1;

/**
 * Tile content has not been requested.
 * @type {number}
 */
export const UNLOADED = 0;

/**
 * Tile content is queued for download.
 * @type {number}
 */
export const QUEUED = 1;

/**
 * Tile content is currently downloading.
 * @type {number}
 */
export const LOADING = 2;

/**
 * Tile content has been downloaded and is being parsed.
 * @type {number}
 */
export const PARSING = 3;

/**
 * Tile content has been parsed and is ready to display.
 * @type {number}
 */
export const LOADED = 4;

/**
 * WGS84 ellipsoid semi-major axis radius in meters.
 * See the {@link https://en.wikipedia.org/wiki/World_Geodetic_System WGS84 specification}.
 * @type {number}
 */
export const WGS84_RADIUS = 6378137;

/**
 * WGS84 ellipsoid flattening factor.
 * See {@link https://en.wikipedia.org/wiki/Flattening ellipsoid flattening}.
 * @type {number}
 */
export const WGS84_FLATTENING = 1 / 298.257223563;

/**
 * WGS84 ellipsoid height offset (difference between equatorial and polar radii) in meters.
 * @type {number}
 */
export const WGS84_HEIGHT = - ( WGS84_FLATTENING * WGS84_RADIUS - WGS84_RADIUS );
