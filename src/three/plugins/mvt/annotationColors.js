// Protomaps basemaps LIGHT theme palette (protomaps/basemaps)
export const CATEGORY_COLORS = {
	tangerine: 0xCB6704,
	green: 0x20834D,
	lapis: 0x315BCF,
	slategray: 0x6A5B8F,
	blue: 0x1A8CBD,
	pink: 0xEF56BA,
	red: 0xF2567A,
	turquoise: 0x00C3D4,
};

export const KIND_CATEGORY = {

	// Food & Drink
	cafe: 'tangerine',
	coffee_shop: 'tangerine',
	restaurant: 'tangerine',
	fast_food: 'tangerine',
	bar: 'tangerine',
	pub: 'tangerine',
	biergarten: 'tangerine',
	nightclub: 'tangerine',
	bakery: 'tangerine',
	food_court: 'tangerine',
	ice_cream: 'tangerine',

	// Nature & Recreation
	park: 'green',
	garden: 'green',
	forest: 'green',
	nature_reserve: 'green',
	beach: 'green',
	peak: 'green',
	volcano: 'green',
	marina: 'green',
	zoo: 'green',
	bench: 'green',
	picnic_site: 'green',
	wetland: 'green',

	// Education & Civic
	school: 'slategray',
	university: 'slategray',
	college: 'slategray',
	kindergarten: 'slategray',
	library: 'slategray',
	stadium: 'slategray',
	post_office: 'slategray',
	townhall: 'slategray',
	courthouse: 'slategray',
	community_centre: 'slategray',
	social_facility: 'slategray',
	place_of_worship: 'slategray',
	prison: 'slategray',
	drinking_water: 'slategray',
	toilets: 'slategray',

	// Shopping & Retail
	supermarket: 'blue',
	grocery: 'blue',
	convenience: 'blue',
	mall: 'blue',
	department_store: 'blue',
	clothes: 'blue',
	electronics: 'blue',
	books: 'blue',
	beauty: 'blue',
	hairdresser: 'blue',
	pharmacy: 'blue',
	bank: 'blue',
	atm: 'blue',

	// Transport
	airport: 'lapis',
	airfield: 'lapis',
	aerodrome: 'lapis',
	train_station: 'lapis',
	station: 'lapis',
	subway_entrance: 'lapis',
	bus_stop: 'lapis',
	ferry_terminal: 'lapis',
	helipad: 'lapis',
	taxi: 'lapis',

	// Culture & Attractions
	museum: 'pink',
	theatre: 'pink',
	cinema: 'pink',
	gallery: 'pink',
	arts_centre: 'pink',
	attraction: 'pink',
	artwork: 'pink',
	theme_park: 'pink',
	viewpoint: 'pink',

	// Healthcare & Emergency
	hospital: 'red',
	doctors: 'red',
	clinic: 'red',
	dentist: 'red',
	veterinary: 'red',
	fire_station: 'red',
	police: 'red',

	// Accommodation & Leisure
	hotel: 'turquoise',
	motel: 'turquoise',
	hostel: 'turquoise',
	guest_house: 'turquoise',
	camp_site: 'turquoise',
	caravan_site: 'turquoise',
	aquarium: 'turquoise',
	sports_centre: 'turquoise',
	swimming_pool: 'turquoise',
	golf_course: 'turquoise',
	fitness_centre: 'turquoise',
	playground: 'turquoise',

};

export const DEFAULT_COLOR = 0xA0A0A0;

const _unmatched = new Set();

export function getAnnotationCategory( layer, properties ) {

	const kind = properties.kind ?? properties[ 'pmap:kind' ] ?? layer;
	const base = typeof kind === 'string' ? kind.split( '/' )[ 0 ] : kind;
	if ( ! ( base in KIND_CATEGORY ) && ! _unmatched.has( base ) ) {

		_unmatched.add( base );
		console.log( `[annotationColors] unmatched kind: "${ base }"` );

	}

	return KIND_CATEGORY[ base ] ?? null;

}

export function getAnnotationColor( layer, properties, target ) {

	const category = getAnnotationCategory( layer, properties );
	return target.setHex( category !== null ? CATEGORY_COLORS[ category ] : DEFAULT_COLOR );

}
