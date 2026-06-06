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
	ImageOverlayPlugin,
	PMTilesOverlay,
	MVTAnnotationsPlugin,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	Vector2,
	Matrix4,
	Vector3,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { AnnotationPoints } from './src/plugins/mvt/AnnotationPoints.js';

const KIND_TO_ICON = {

	// Food & Drink
	cafe: 'restaurant', coffee_shop: 'restaurant', restaurant: 'restaurant', fast_food: 'restaurant',
	bar: 'restaurant', pub: 'restaurant', biergarten: 'restaurant', nightclub: 'restaurant',
	bakery: 'restaurant', food_court: 'restaurant', ice_cream: 'restaurant',

	// Nature & Recreation
	park: 'park', garden: 'park', forest: 'park', nature_reserve: 'park', beach: 'park',
	peak: 'park', volcano: 'park', marina: 'park', zoo: 'park', bench: 'park',
	picnic_site: 'park', wetland: 'park',

	// Education & Civic
	school: 'town-hall', university: 'town-hall', college: 'town-hall', kindergarten: 'town-hall',
	library: 'town-hall', stadium: 'town-hall', post_office: 'town-hall', townhall: 'town-hall',
	courthouse: 'town-hall', community_centre: 'town-hall', social_facility: 'town-hall',
	place_of_worship: 'town-hall', prison: 'town-hall', drinking_water: 'town-hall', toilets: 'town-hall',

	// Shopping & Retail
	supermarket: 'shop', grocery: 'shop', convenience: 'shop', mall: 'shop',
	department_store: 'shop', clothes: 'shop', electronics: 'shop', books: 'shop',
	beauty: 'shop', hairdresser: 'shop', pharmacy: 'shop', bank: 'shop', atm: 'shop',

	// Transport
	airport: 'airport', airfield: 'airport', aerodrome: 'airport', train_station: 'airport',
	station: 'airport', subway_entrance: 'airport', bus_stop: 'airport', ferry_terminal: 'airport',
	helipad: 'airport', taxi: 'airport',

	// Culture & Attractions
	museum: 'museum', theatre: 'museum', cinema: 'museum', gallery: 'museum', arts_centre: 'museum',
	attraction: 'museum', artwork: 'museum', theme_park: 'museum', viewpoint: 'museum',

	// Healthcare & Emergency
	hospital: 'hospital', doctors: 'hospital', clinic: 'hospital', dentist: 'hospital',
	veterinary: 'hospital', fire_station: 'hospital', police: 'hospital',

	// Accommodation & Leisure
	hotel: 'lodging', motel: 'lodging', hostel: 'lodging', guest_house: 'lodging',
	camp_site: 'lodging', caravan_site: 'lodging', aquarium: 'lodging', sports_centre: 'lodging',
	swimming_pool: 'lodging', golf_course: 'lodging', fitness_centre: 'lodging', playground: 'lodging',

};

const params = {

	errorTarget: 20,
	occupancyGrid: false,

};

let controls, scene, renderer, camera, tiles;
let annotationsPoints = null;

// raycasting
const pointer = new Vector2();
const raycaster = new Raycaster();
const tooltip = document.getElementById( 'tooltip' );
let lastClientX = 0, lastClientY = 0;

const _annotationsMatrix = new Matrix4();
const _annotationsCameraPos = new Vector3();

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	const onAnnotationsUpdate = ( added, removed ) => {

		_annotationsMatrix.copy( tiles.group.matrixWorld ).invert();
		_annotationsCameraPos.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _annotationsMatrix );
		annotationsPoints.position.copy( _annotationsCameraPos );
		annotationsPoints.updateMatrixWorld( true );
		annotationsPoints.update( added, removed );

	};

	const overlay = new PMTilesOverlay( {
		url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
	} );

	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader().setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' )
	} ) );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new ImageOverlayPlugin( { overlays: [ overlay ], renderer } ) );
	tiles.registerPlugin( new MVTAnnotationsPlugin( {
		overlay,
		camera,
		filterAnnotation: ( layer, properties ) => properties.kind in KIND_TO_ICON,
		onAnnotationsUpdate: onAnnotationsUpdate,
	} ) );

	annotationsPoints = new AnnotationPoints( {
		getKind: ( layer, properties ) => KIND_TO_ICON[ properties.kind ] || null,
	} );
	tiles.group.add( annotationsPoints );

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
	controls.flightSpeed = 0.5;
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
	gui.add( params, 'occupancyGrid' ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).displayOccupancyGrid = v;

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
	const hits = raycaster.intersectObject( annotationsPoints );

	if ( hits.length > 0 ) {

		const { properties } = hits[ 0 ];
		if ( properties && properties.name ) {

			tooltip.textContent = properties.name;
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
	tiles.errorTarget = params.errorTarget;

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
