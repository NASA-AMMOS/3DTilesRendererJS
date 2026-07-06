import {
	WGS84_ELLIPSOID,
	CAMERA_FRAME,
	GeoUtils,
	GlobeControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	GLTFExtensionsPlugin,
	CesiumIonAuthPlugin,
	PMTilesOverlay,
	MVTAnnotationsPlugin,
	MVTAnnotationsDriver,
	MVTIconGlyphs,
	MVTLabelGlyphs,
	UpdateOnChangePlugin,
} from '3d-tiles-renderer/plugins';
import { LoadRegionPlugin } from '3d-tiles-renderer/three/plugins';
import { CameraCartographicRegion } from './src/plugins/CameraCartographicRegion.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	Vector2,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshBVHPlugin } from './src/plugins/MeshBVHPlugin.js';

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

// localized name variants exposed by the protomaps v4 basemap
const LANGUAGES = [ 'default', 'en', 'ja', 'ko' ];

const params = {

	language: 'default',
	displayIcons: true,
	displayPaths: true,

	occupancyGrid: false,
	annotationLines: false,
	tileHierarchy: false,

};

let controls, scene, renderer, camera, tiles;
let driver = null;

// raycasting
const pointer = new Vector2();
const raycaster = new Raycaster();
const tooltip = document.getElementById( 'tooltip' );
let lastClientX = 0, lastClientY = 0;

// supplies the plugin's annotation callbacks and owns its render objects ( added to the driver's
// group, which the plugin mounts under the tile group ): point annotations -> `annotationPoints`,
// text anchors -> `characterPoints`
class ExampleAnnotationsDriver extends MVTAnnotationsDriver {

	constructor() {

		super();

		this.language = 'default';
		this.displayIcons = true;
		this.displayPaths = true;

		const dpr = renderer.getPixelRatio();

		// icons for point annotations
		const annotationPoints = new MVTIconGlyphs( {
			getKind: ( layer, properties ) => {

				return KIND_TO_ICON[ properties.kind ] || 'point';

			}
		} );

		// fallback dot + maki icons drawn into the atlas
		annotationPoints.glyphAtlas.drawChar( 'point', '●', {
			fillStyle: 'white',
			strokeStyle: '#3f3e4c',
			strokeWidth: 3 * dpr,
			font: '30px sans-serif',
		} );

		MAKI_ICONS.forEach( icon =>
			fetch( MAKI_BASE + icon + '.svg' )
				.then( r => r.text() )
				.then( svgText => {

					annotationPoints.glyphAtlas.drawSVG( icon, svgText, {
						fillStyle: 'white',
						strokeStyle: '#3f3e4c',
						strokeWidth: 3 * dpr,
						iconScale: 0.9,
					} );

				} )
				.catch( () => null )

		);

		// glyphs for text ( road ) annotations
		const characterPoints = new MVTLabelGlyphs( {
			strokeStyle: '#3f3e4c',
			strokeWidth: 3 * dpr,
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

	onAnnotationsUpdate( added, removed ) {

		const a = splitAnnotations( added );
		const r = splitAnnotations( removed );
		this.annotationPoints.update( a.points, r.points );
		this.characterPoints.update( a.text, r.text );

		// route occupancy annotations to the right renderer: point annotations expose a `position`,
		// text-anchor annotations expose `characterPositions`
		function splitAnnotations( set ) {

			const points = [];
			const text = [];
			for ( const item of set ) {

				if ( item.characterPositions !== undefined ) {

					text.push( item );

				} else {

					points.push( item );

				}

			}

			return { points, text };

		}

	}

	dispose() {

		this.annotationPoints.dispose();
		this.characterPoints.dispose();

	}

}

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	const overlay = new PMTilesOverlay( {
		url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
	} );

	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader().setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' )
	} ) );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new MeshBVHPlugin() );
	driver = new ExampleAnnotationsDriver();
	driver.language = params.language;
	tiles.registerPlugin( new MVTAnnotationsPlugin( {
		overlay,
		camera,
		driver,
	} ) );

	// use the camera cartographic region plugin to prevent particularly low-lod
	// tiles from loading beneath the camera, causing navigation issues.
	const cameraRegion = new CameraCartographicRegion( {
		camera,
		radius: 1500,
		errorTarget: 5000,
	} );

	tiles.registerPlugin( new LoadRegionPlugin( {
		regions: [ cameraRegion ],
	} ) );

	tiles.group.rotation.x = - Math.PI / 2;
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;
	controls.enableFlight = true;
	controls.flightSpeed = 0.25;
	controls.maxAltitude = Math.PI / 2;

	reinstantiateTiles();

	// Zaragoza, Spain
	tiles.group.updateMatrixWorld();
	WGS84_ELLIPSOID.getObjectFrame(
		41.6275 * Math.PI / 180, - 0.8858 * Math.PI / 180, 2000,
		0, - Math.PI / 4, 0,
		camera.matrixWorld, CAMERA_FRAME,
	);
	camera.matrixWorld.premultiply( tiles.group.matrixWorld );
	camera.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize );
	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	controls.addEventListener( 'change', updateTooltip );

	// GUI
	const gui = new GUI();
	gui.add( params, 'language', LANGUAGES ).onChange( v => {

		driver.language = v;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'displayIcons' ).onChange( v => {

		driver.displayIcons = v;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'displayPaths' ).onChange( v => {

		driver.displayPaths = v;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );

	const debugFolder = gui.addFolder( 'Debug' );
	debugFolder.add( params, 'occupancyGrid' ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).debug.occupancy.enabled = v;

	} );
	debugFolder.add( params, 'annotationLines' ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).debug.paths.enabled = v;

	} );
	debugFolder.add( params, 'tileHierarchy' ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).debug.hierarchy.enabled = v;

	} );

}

function onPointerMove( e ) {

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ( ( e.clientX - rect.left ) / rect.width ) * 2 - 1;
	pointer.y = - ( ( e.clientY - rect.top ) / rect.height ) * 2 + 1;
	lastClientX = e.clientX;
	lastClientY = e.clientY;

	updateTooltip();

}

function updateTooltip() {

	raycaster.setFromCamera( pointer, camera );

	const hits = raycaster.intersectObject( driver.annotationPoints );
	if ( hits.length > 0 ) {

		const { properties } = hits[ 0 ];
		if ( properties ) {

			tooltip.textContent = properties.name || properties[ 'name:en' ] || `${ properties.kind.replace( '_', ' ' ) } (unnamed)`;
			tooltip.style.display = 'block';
			const x = Math.min( Math.max( lastClientX - tooltip.offsetWidth / 2, 4 ), window.innerWidth - tooltip.offsetWidth - 4 );
			const y = Math.max( lastClientY - tooltip.offsetHeight - 10, 4 );
			tooltip.style.left = x + 'px';
			tooltip.style.top = y + 'px';

		}

	} else {

		tooltip.style.display = 'none';

	}

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) {

		return;

	}

	// controls update
	controls.update();

	// tiles update
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );
	camera.updateMatrixWorld();
	tiles.update();

	renderer.render( scene, camera );

	// credits
	const mat = tiles.group.matrixWorldInverse;
	const vec = camera.position.clone().applyMatrix4( mat );
	const res = {};
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );

	const attributions = tiles.getAttributions()[ 0 ]?.value || '';
	document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + attributions;

}
