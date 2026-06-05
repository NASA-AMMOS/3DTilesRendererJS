import { GlyphAtlasTexture } from './GlyphAtlasTexture.js';

const MAKI_BASE = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@8/icons/';

// Maps annotation kind → Maki icon filename (without .svg extension)
const KIND_TO_MAKI = {

	// Nature & Recreation
	beach: 'beach',
	forest: 'natural',
	marina: 'harbor',
	park: 'park',
	peak: 'mountain',
	zoo: 'zoo',
	garden: 'garden',
	bench: 'picnic-site',
	nature_reserve: 'natural',
	picnic_site: 'picnic-site',
	volcano: 'volcano',
	wetland: 'wetland',

	// Transport
	aerodrome: 'airport',
	station: 'rail',
	train_station: 'rail',
	bus_stop: 'bus',
	ferry_terminal: 'ferry',
	airport: 'airport',
	airfield: 'airfield',
	subway_entrance: 'rail-metro',
	helipad: 'heliport',
	taxi: 'taxi',

	// Civic & Education
	stadium: 'stadium',
	university: 'college',
	library: 'library',
	school: 'school',
	kindergarten: 'school',
	college: 'college',
	animal: 'animal-shelter',
	toilets: 'toilet',
	drinking_water: 'drinking-water',
	post_office: 'post',
	building: 'building',
	townhall: 'town-hall',
	courthouse: 'town-hall',
	community_centre: 'residential-community',
	social_facility: 'shelter',
	place_of_worship: 'place-of-worship',
	prison: 'prison',

	// Food & Drink
	restaurant: 'restaurant',
	fast_food: 'fast-food',
	cafe: 'cafe',
	bar: 'bar',
	pub: 'beer',
	biergarten: 'beer',
	bakery: 'bakery',
	coffee_shop: 'cafe',
	ice_cream: 'ice-cream',
	food_court: 'fast-food',
	nightclub: 'nightclub',

	// Shopping
	supermarket: 'grocery',
	convenience: 'convenience',
	books: 'shop',
	beauty: 'hairdresser',
	electronics: 'mobile-phone',
	clothes: 'clothing-store',
	grocery: 'grocery',
	pharmacy: 'pharmacy',
	bank: 'bank',
	atm: 'bank',
	hairdresser: 'hairdresser',
	mall: 'shop',
	department_store: 'shop',

	// Culture & Attractions
	museum: 'museum',
	attraction: 'attraction',
	theatre: 'theatre',
	artwork: 'art-gallery',
	cinema: 'cinema',
	gallery: 'art-gallery',
	arts_centre: 'art-gallery',
	theme_park: 'amusement-park',
	viewpoint: 'viewpoint',

	// Healthcare & Emergency
	hospital: 'hospital',
	doctors: 'doctor',
	clinic: 'doctor',
	dentist: 'dentist',
	veterinary: 'veterinary',
	fire_station: 'fire-station',
	police: 'police',

	// Accommodation & Leisure
	hotel: 'lodging',
	motel: 'lodging',
	hostel: 'lodging',
	guest_house: 'lodging',
	camp_site: 'campsite',
	caravan_site: 'campsite',
	aquarium: 'aquarium',
	sports_centre: 'pitch',
	swimming_pool: 'swimming',
	golf_course: 'golf',
	fitness_centre: 'fitness-centre',
	playground: 'playground',

};

const GLYPH_SIZE = 64;
// ceil( sqrt( ~90 kinds ) ) = 10 → 100 slots gives comfortable room
const GLYPH_SLOT_COUNT = 128;
// fraction of the slot occupied by the icon (1 = full slot, 0.5 = half)
const ICON_SCALE = 0.75;

export class AnnotationGlyphAtlasTexture extends GlyphAtlasTexture {

	constructor() {

		super( GLYPH_SLOT_COUNT, GLYPH_SIZE );

		this._loadPromise = this._load();

	}

	async _load() {

		// Deduplicate Maki names so each SVG is fetched only once
		const makiNames = [ ...new Set( Object.values( KIND_TO_MAKI ) ) ];

		const fetched = await Promise.all(
			makiNames.map( name =>
				fetch( MAKI_BASE + name + '.svg' )
					.then( r => r.text() )
					.then( svg => [ name, this._parseSVG( svg ) ] )
					.catch( () => [ name, null ] )
			)
		);

		const parsedByMaki = new Map( fetched );

		for ( const [ kind, makiName ] of Object.entries( KIND_TO_MAKI ) ) {

			const parsed = parsedByMaki.get( makiName );
			if ( ! parsed ) continue;

			const { vbW, vbH, paths } = parsed;

			this._draw( kind, ( ctx, x, y, w, h ) => {

				const iw = w * ICON_SCALE;
				const ih = h * ICON_SCALE;
				const scale = Math.min( iw / vbW, ih / vbH );
				const ox = x + ( w - vbW * scale ) / 2;
				const oy = y + ( h - vbH * scale ) / 2;

				ctx.save();
				ctx.translate( ox, oy );
				ctx.scale( scale, scale );

				ctx.lineWidth = 10 / scale;
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				ctx.strokeStyle = '#3f3e4c';
				for ( const path of paths ) ctx.stroke( path );

				ctx.fillStyle = 'white';
				for ( const path of paths ) ctx.fill( path );

				ctx.restore();

			} );

		}

	}

	_parseSVG( svgText ) {

		const doc = new DOMParser().parseFromString( svgText, 'image/svg+xml' );
		const svg = doc.documentElement;
		const vb = ( svg.getAttribute( 'viewBox' ) ?? '0 0 15 15' ).trim().split( /[\s,]+/ ).map( Number );
		const paths = [ ...svg.querySelectorAll( 'path' ) ]
			.map( el => el.getAttribute( 'd' ) )
			.filter( Boolean )
			.map( d => new Path2D( d ) );

		return { vbW: vb[ 2 ], vbH: vb[ 3 ], paths };

	}

	// Returns { uvX, uvY } — top-left corner of the slot in GPU texture space (flipY applied).
	getKindUV( kind ) {

		const slot = this.get( kind );
		if ( slot === null ) return null;

		const { width, height } = this.image;
		return {
			uvX: slot.x / width,
			uvY: ( height - slot.y ) / height,
		};

	}

	// UV size of one slot. Y is negative so gl_PointCoord.y (0=top → 1=bottom)
	// scans downward in texture space (decreasing V).
	get glyphCellUVSize() {

		const { width, height } = this.image;
		return { u: this.slotSize / width, v: - this.slotSize / height };

	}

}
