const KIND_TO_ICON = {

	// Food & Drink
	cafe: 'restaurant',
	coffee_shop: 'restaurant',
	restaurant: 'restaurant',
	fast_food: 'restaurant',
	bar: 'restaurant',
	pub: 'restaurant',
	biergarten: 'restaurant',
	nightclub: 'restaurant',
	bakery: 'restaurant',
	food_court: 'restaurant',
	ice_cream: 'restaurant',

	// Nature & Recreation
	park: 'park',
	garden: 'park',
	forest: 'park',
	nature_reserve: 'park',
	beach: 'park',
	peak: 'park',
	volcano: 'park',
	marina: 'park',
	zoo: 'park',
	bench: 'park',
	picnic_site: 'park',
	wetland: 'park',

	// Education & Civic
	school: 'town-hall',
	university: 'town-hall',
	college: 'town-hall',
	kindergarten: 'town-hall',
	library: 'town-hall',
	stadium: 'town-hall',
	post_office: 'town-hall',
	townhall: 'town-hall',
	courthouse: 'town-hall',
	community_centre: 'town-hall',
	social_facility: 'town-hall',
	place_of_worship: 'town-hall',
	prison: 'town-hall',
	drinking_water: 'town-hall',
	toilets: 'town-hall',

	// Shopping & Retail
	supermarket: 'shop',
	grocery: 'shop',
	convenience: 'shop',
	mall: 'shop',
	department_store: 'shop',
	clothes: 'shop',
	electronics: 'shop',
	books: 'shop',
	beauty: 'shop',
	hairdresser: 'shop',
	pharmacy: 'shop',
	bank: 'shop',
	atm: 'shop',

	// Transport
	airport: 'airport',
	airfield: 'airport',
	aerodrome: 'airport',
	train_station: 'airport',
	station: 'airport',
	subway_entrance: 'airport',
	bus_stop: 'airport',
	ferry_terminal: 'airport',
	helipad: 'airport',
	taxi: 'airport',

	// Culture & Attractions
	museum: 'museum',
	theatre: 'museum',
	cinema: 'museum',
	gallery: 'museum',
	arts_centre: 'museum',
	attraction: 'museum',
	artwork: 'museum',
	theme_park: 'museum',
	viewpoint: 'museum',

	// Healthcare & Emergency
	hospital: 'hospital',
	doctors: 'hospital',
	clinic: 'hospital',
	dentist: 'hospital',
	veterinary: 'hospital',
	fire_station: 'hospital',
	police: 'hospital',

	// Accommodation & Leisure
	hotel: 'lodging',
	motel: 'lodging',
	hostel: 'lodging',
	guest_house: 'lodging',
	camp_site: 'lodging',
	caravan_site: 'lodging',
	aquarium: 'lodging',
	sports_centre: 'lodging',
	swimming_pool: 'lodging',
	golf_course: 'lodging',
	fitness_centre: 'lodging',
	playground: 'lodging',

};

export function getAnnotationKind( layer, properties ) {

	return KIND_TO_ICON[ properties.kind ] ?? null;

}

// Default filter: only show POIs whose kind maps to a known category (has color + icon).
// Anything not in KIND_TO_ICON is considered unclassified data not worth displaying.
export function defaultGetAnnotation( layer, properties ) {

	return properties.kind in KIND_TO_ICON;

}
