/* non exhaustive list of layer colors */
export const LAYER_COLORS = {
	// Nature & Water
	'water': 0x201f20,
	'waterway': 0x201f20,
	'landuse': 0xcaedc1,
	'landuse_overlay': 0xcaedc1,
	'park': 0x5da859,

	// Infrastructure
	'building': 0xeeeeee,
	'road': 0x444444,
	'transportation': 0x444444,

	// Boundaries & Background
	'boundaries': 0x444545,
	'background': 0x111111,
	'default': 0x222222
};

/* Default layer ordering for vector tiles (bottom to top) */
export const DEFAULT_LAYER_ORDER = [
	'landuse',
	'landuse_overlay',
	'park',
	'water',
	'waterway',
	'transportation',
	'road',
	'building',
	'boundaries',
	'poi',
	'place_label'
];
