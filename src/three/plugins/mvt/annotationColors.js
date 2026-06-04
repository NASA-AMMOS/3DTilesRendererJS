// Protomaps basemaps LIGHT theme palette (protomaps/basemaps)
const GREEN = 0x20834D; // park, forest, nature
const LAPIS = 0x315BCF; // transport
const SLATEGRAY = 0x6A5B8F; // education, civic, public services
const BLUE = 0x1A8CBD; // shopping, retail
const TANGERINE = 0xCB6704; // food & drink
const PINK = 0xEF56BA; // culture, tourism, attractions
const RED = 0xF2567A; // healthcare, emergency
const TURQUOISE = 0x00C3D4; // accommodation, leisure

const KIND_COLORS = {

	// Food & Drink — tangerine
	cafe: TANGERINE,
	coffee_shop: TANGERINE,
	restaurant: TANGERINE,
	fast_food: TANGERINE,
	bar: TANGERINE,
	pub: TANGERINE,
	biergarten: TANGERINE,
	nightclub: TANGERINE,
	bakery: TANGERINE,
	food_court: TANGERINE,
	ice_cream: TANGERINE,

	// Nature & Recreation — green
	park: GREEN,
	garden: GREEN,
	forest: GREEN,
	nature_reserve: GREEN,
	beach: GREEN,
	peak: GREEN,
	volcano: GREEN,
	marina: GREEN,
	zoo: GREEN,
	bench: GREEN,
	picnic_site: GREEN,
	wetland: GREEN,

	// Education & Civic — slategray
	school: SLATEGRAY,
	university: SLATEGRAY,
	college: SLATEGRAY,
	kindergarten: SLATEGRAY,
	library: SLATEGRAY,
	stadium: SLATEGRAY,
	post_office: SLATEGRAY,
	townhall: SLATEGRAY,
	courthouse: SLATEGRAY,
	community_centre: SLATEGRAY,
	social_facility: SLATEGRAY,
	place_of_worship: SLATEGRAY,
	prison: SLATEGRAY,
	drinking_water: SLATEGRAY,
	toilets: SLATEGRAY,

	// Shopping & Retail — blue
	supermarket: BLUE,
	grocery: BLUE,
	convenience: BLUE,
	mall: BLUE,
	department_store: BLUE,
	clothes: BLUE,
	electronics: BLUE,
	books: BLUE,
	beauty: BLUE,
	hairdresser: BLUE,
	pharmacy: BLUE,
	bank: BLUE,
	atm: BLUE,

	// Transport — lapis
	airport: LAPIS,
	airfield: LAPIS,
	aerodrome: LAPIS,
	train_station: LAPIS,
	station: LAPIS,
	subway_entrance: LAPIS,
	bus_stop: LAPIS,
	ferry_terminal: LAPIS,
	helipad: LAPIS,
	taxi: LAPIS,

	// Culture & Attractions — pink
	museum: PINK,
	theatre: PINK,
	cinema: PINK,
	gallery: PINK,
	arts_centre: PINK,
	attraction: PINK,
	artwork: PINK,
	theme_park: PINK,
	viewpoint: PINK,

	// Healthcare & Emergency — red
	hospital: RED,
	doctors: RED,
	clinic: RED,
	dentist: RED,
	veterinary: RED,
	fire_station: RED,
	police: RED,

	// Accommodation & Leisure — turquoise
	hotel: TURQUOISE,
	motel: TURQUOISE,
	hostel: TURQUOISE,
	guest_house: TURQUOISE,
	camp_site: TURQUOISE,
	caravan_site: TURQUOISE,
	aquarium: TURQUOISE,
	sports_centre: TURQUOISE,
	swimming_pool: TURQUOISE,
	golf_course: TURQUOISE,
	fitness_centre: TURQUOISE,
	playground: TURQUOISE,

	// Places layer — light neutral so they read on satellite without competing with POIs
	country: 0xC8C8C8,
	state: 0xC0C0C0,
	county: 0xB8B8B8,
	city: 0xE0E0E0,
	town: 0xD0D0D0,
	village: 0xC0C0C0,
	suburb: 0xB0B0B0,
	neighbourhood: 0xA8A8A8,
	hamlet: 0xA0A0A0,
	locality: 0x989898,
	island: GREEN,

};

const DEFAULT_COLOR = 0xA0A0A0;

const _unmatched = new Set();

export function getAnnotationColor( layer, properties, target ) {

	const kind = properties.kind ?? properties[ 'pmap:kind' ] ?? layer;
	// compound kinds like "place_of_worship/christian" — use base segment
	const base = typeof kind === 'string' ? kind.split( '/' )[ 0 ] : kind;
	if ( ! ( base in KIND_COLORS ) && ! _unmatched.has( base ) ) {

		_unmatched.add( base );
		console.log( `[annotationColors] unmatched kind: "${ base }"` );

	}

	return target.setHex( KIND_COLORS[ base ] ?? DEFAULT_COLOR );

}

export { KIND_COLORS, DEFAULT_COLOR };
