import {
	GlobeControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	CesiumIonAuthPlugin,
	GLTFExtensionsPlugin,
	ImageOverlayPlugin,
	CesiumIonOverlay,
	DebugTilesPlugin,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
	Sphere,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let controls, scene, renderer, camera;
let terrainTiles, plateauTiles, imageryOverlay;
let cameraInitialized = false;

const params = {
	errorTarget: 16,
	displayBoxBounds: false,
};

init();
animate();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( 1150000, 3920000, 4980000 );

	// lights
	const ambientLight = new AmbientLight( 0xffffff, 0.25 );
	const dirLight = new DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 1, 1, 1 );
	camera.add( ambientLight, dirLight, dirLight.target );
	scene.add( camera );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;

	// terrain: Cesium World Terrain draped with Bing Maps Aerial surface imagery
	imageryOverlay = new CesiumIonOverlay( {
		assetId: '2',
		apiToken: import.meta.env.VITE_ION_KEY,
	} );

	terrainTiles = new TilesRenderer();
	terrainTiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '1', autoRefreshToken: true } ) );
	terrainTiles.registerPlugin( new TilesFadePlugin() );
	terrainTiles.registerPlugin( new ImageOverlayPlugin( {
		renderer,
		overlays: [ imageryOverlay ],
	} ) );
	terrainTiles.group.rotation.x = - Math.PI / 2;
	scene.add( terrainTiles.group );

	// PLATEAU city buildings — glTF content with DRACO geometry and KTX2 textures
	const ktx2Loader = new KTX2Loader()
		.setTranscoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/' )
		.detectSupport( renderer );

	window.TILES = plateauTiles = new TilesRenderer();
	plateauTiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2602291', autoRefreshToken: true } ) );
	plateauTiles.registerPlugin( new TilesFadePlugin() );
	plateauTiles.registerPlugin( new DebugTilesPlugin() );
	plateauTiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader().setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' ),
		ktxLoader: ktx2Loader,
	} ) );
	plateauTiles.group.rotation.x = - Math.PI / 2;
	scene.add( plateauTiles.group );

	// raise the byte cache so tiles aren't evicted too aggressively while panning the city
	for ( const tiles of [ terrainTiles, plateauTiles ] ) {

		tiles.lruCache.minBytesSize = 1e9;
		tiles.lruCache.maxBytesSize = 2e9;

	}

	// both datasets share the ellipsoid frame; drive the controls from the terrain
	controls.setEllipsoid( terrainTiles.ellipsoid, terrainTiles.group );

	// frame the camera on the PLATEAU data once its root tileset is available
	plateauTiles.addEventListener( 'load-root-tileset', frameCameraOnPlateau );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'errorTarget', 1, 30, 1 );
	gui.add( params, 'displayBoxBounds' ).name( 'PLATEAU box bounds' );

}

function frameCameraOnPlateau() {

	if ( cameraInitialized ) {

		return;

	}

	const sphere = new Sphere();
	if ( ! plateauTiles.getBoundingSphere( sphere ) ) {

		return;

	}

	cameraInitialized = true;

	// move the bounding sphere into world space and position the camera above it
	plateauTiles.group.updateMatrixWorld();
	sphere.applyMatrix4( plateauTiles.group.matrixWorld );

	const { center, radius } = sphere;
	const up = center.clone().normalize();
	camera.position.copy( center ).addScaledVector( up, radius * 2 );
	camera.lookAt( center );

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;

	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	controls.update();
	camera.updateMatrixWorld();

	plateauTiles.getPluginByName( 'DEBUG_TILES_PLUGIN' ).displayBoxBounds = params.displayBoxBounds;

	// update both tile sets against the shared camera
	for ( const tiles of [ terrainTiles, plateauTiles ] ) {

		tiles.errorTarget = params.errorTarget;
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.setCamera( camera );
		tiles.update();

	}

	renderer.render( scene, camera );

}
