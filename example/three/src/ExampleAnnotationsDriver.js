import {
	MVTAnnotationsDriver,
	MVTIconGlyphs,
	MVTLabelGlyphs,
} from '3d-tiles-renderer/plugins';

// CDN source for the icons
const MAKI_BASE = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@8/icons/';
const MAKI_ICONS = [
	// Food & Drink
	'restaurant', 'cafe', 'fast-food', 'bar', 'beer', 'bakery', 'ice-cream',

	// Nature & Recreation
	'park', 'garden', 'beach', 'mountain', 'harbor', 'zoo', 'viewpoint',

	// Education & Civic
	'school', 'college', 'library', 'stadium', 'post', 'town-hall', 'place-of-worship', 'drinking-water', 'toilet', 'prison',

	// Shopping & Retail
	'shop', 'grocery', 'convenience', 'clothing-store', 'pharmacy', 'bank',

	// Transport
	'airport', 'airfield', 'heliport', 'taxi', 'rail', 'rail-metro', 'bus', 'ferry',

	// Culture & Attractions
	'museum', 'theatre', 'cinema', 'art-gallery', 'attraction', 'amusement-park', 'monument', 'castle',

	// Healthcare & Emergency
	'hospital', 'doctor', 'dentist', 'veterinary', 'fire-station', 'police',

	// Accommodation & Leisure
	'lodging', 'campsite', 'aquarium', 'swimming', 'golf', 'fitness-centre', 'playground',
];

// Map from point kind to icon
const KIND_TO_ICON = {

	// Food & Drink
	restaurant: 'restaurant', food_court: 'restaurant', cafe: 'cafe', coffee_shop: 'cafe',
	fast_food: 'fast-food', bar: 'bar', pub: 'bar', nightclub: 'bar', biergarten: 'beer',
	bakery: 'bakery', ice_cream: 'ice-cream',

	// Nature & Recreation
	park: 'park', forest: 'park', nature_reserve: 'park', bench: 'park', picnic_site: 'park',
	wetland: 'park', garden: 'garden', beach: 'beach', peak: 'mountain', volcano: 'mountain',
	marina: 'harbor', zoo: 'zoo', viewpoint: 'viewpoint',

	// Education & Civic
	school: 'school', kindergarten: 'school', university: 'college', college: 'college',
	library: 'library', stadium: 'stadium', post_office: 'post', townhall: 'town-hall',
	courthouse: 'town-hall', community_centre: 'town-hall', social_facility: 'town-hall',
	place_of_worship: 'place-of-worship', drinking_water: 'drinking-water', toilets: 'toilet',
	prison: 'prison',

	// Shopping & Retail
	mall: 'shop', department_store: 'shop', electronics: 'shop', books: 'shop', beauty: 'shop',
	hairdresser: 'shop', supermarket: 'grocery', grocery: 'grocery', convenience: 'convenience',
	clothes: 'clothing-store', pharmacy: 'pharmacy', bank: 'bank', atm: 'bank',

	// Transport
	airport: 'airport', aerodrome: 'airport', airfield: 'airfield', helipad: 'heliport',
	taxi: 'taxi', train_station: 'rail', station: 'rail', subway_entrance: 'rail-metro',
	bus_stop: 'bus', ferry_terminal: 'ferry',

	// Culture & Attractions
	museum: 'museum', theatre: 'theatre', cinema: 'cinema', gallery: 'art-gallery', arts_centre: 'art-gallery',
	artwork: 'art-gallery', attraction: 'attraction', theme_park: 'amusement-park', monument: 'monument', castle: 'castle',

	// Healthcare & Emergency
	hospital: 'hospital', doctors: 'doctor', clinic: 'doctor', dentist: 'dentist', veterinary: 'veterinary',
	fire_station: 'fire-station', police: 'police',

	// Accommodation & Leisure
	hotel: 'lodging', motel: 'lodging', hostel: 'lodging', guest_house: 'lodging', camp_site: 'campsite', caravan_site: 'campsite',
	aquarium: 'aquarium', sports_centre: 'stadium', swimming_pool: 'swimming', golf_course: 'golf', fitness_centre: 'fitness-centre',
	playground: 'playground',

};

// Supplies the plugin's annotation callbacks and owns its render objects ( added to the driver's
// group, which the plugin mounts under the tile group ): point annotations -> `annotationPoints`,
// text anchors -> `characterPoints`. Maki icons are drawn into the atlas from a CDN.
export class ExampleAnnotationsDriver extends MVTAnnotationsDriver {

	constructor() {

		super();

		this.language = 'en';
		this.displayIcons = true;
		this.displayPaths = true;

		// stroke width scaled to the atlas resolution so outlines look the same on all devices
		const strokeWidth = 1.25 * window.devicePixelRatio;

		// icons for point annotations
		const annotationPoints = new MVTIconGlyphs( {
			getKind: ( layer, properties ) => {

				return KIND_TO_ICON[ properties.kind ] || 'point';

			}
		} );

		// fallback dot + maki icons drawn into the atlas
		annotationPoints.glyphAtlas.drawChar( 'point', '●', {
			fillStyle: 'white',
			strokeStyle: '#5c5b6b',
			strokeWidth,
			font: '30px sans-serif',
		} );

		MAKI_ICONS.forEach( icon =>
			fetch( MAKI_BASE + icon + '.svg' )
				.then( r => r.text() )
				.then( svgText => {

					annotationPoints.glyphAtlas.drawSVG( icon, svgText, {
						fillStyle: 'white',
						strokeStyle: '#5c5b6b',
						strokeWidth,
						iconScale: 0.9,
					} );

				} )
				.catch( () => null )

		);

		// glyphs for text ( road ) annotations
		const characterPoints = new MVTLabelGlyphs( {
			size: 17,
			glyphSize: 17 * window.devicePixelRatio,
			strokeStyle: '#5c5b6b',
			strokeWidth,
		} );

		this.group.add( annotationPoints, characterPoints );
		this.annotationPoints = annotationPoints;
		this.characterPoints = characterPoints;

	}

	filterAnnotation( layer, properties, type ) {

		if ( type === 1 ) {

			return properties.kind in KIND_TO_ICON;

		} else {

			return 'name' in properties;

		}

	}

	isAnnotationEnabled( layer, properties, type ) {

		if ( type === 1 && this.displayIcons ) return true;
		if ( type === 2 && this.displayPaths ) return true;
		return false;

	}

	getText( properties ) {

		const { language } = this;
		if ( language !== 'default' ) {

			return properties[ `name:${ language }` ] ?? properties.name ?? '';

		}

		return properties.name ?? '';

	}

	measureChar( char ) {

		return this.characterPoints.measureChar( char );

	}

	onPointsUpdate( added, removed ) {

		this.annotationPoints.update( added, removed );

	}

	onLabelsUpdate( added, removed ) {

		this.characterPoints.update( added, removed );

	}

	dispose() {

		this.annotationPoints.dispose();
		this.characterPoints.dispose();

	}

}
