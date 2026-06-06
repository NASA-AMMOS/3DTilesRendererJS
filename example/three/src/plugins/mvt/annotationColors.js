const KIND_CATEGORY = {

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

export function getAnnotationKind( layer, properties ) {

	const kind = properties.kind ?? properties[ 'pmap:kind' ] ?? layer;
	if ( typeof kind !== 'string' ) return null;
	return kind.split( '/' )[ 0 ];

}

// Default filter: only show POIs whose kind maps to a known category (has color + icon).
// Anything not in KIND_CATEGORY is considered unclassified data not worth displaying.
export function defaultGetAnnotation( layer, properties ) {

	const kind = properties.kind ?? properties[ 'pmap:kind' ] ?? layer;
	if ( typeof kind !== 'string' ) return false;
	const base = kind.split( '/' )[ 0 ];
	return base in KIND_CATEGORY;

}
