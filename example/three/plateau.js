import {
	GlobeControls,
	TilesRenderer,
	DEFAULT_LRU_CACHE,
	DEFAULT_DOWNLOAD_QUEUE,
	DEFAULT_PARSE_QUEUE,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	CesiumIonAuthPlugin,
	GLTFExtensionsPlugin,
	ImageOverlayPlugin,
	CesiumIonOverlay,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let controls, scene, renderer, camera;
let terrainTiles, plateauTiles;

const params = {
	plateauErrorTarget: 16,
	terrainErrorTarget: 8,
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

	// camera — start looking over central Tokyo near the National Stadium
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( - 3957450.494952031, 3698523.192570713, - 3355060.6457956354 );
	camera.rotation.set( 2.5561957056275357, - 0.4480838659317401, 2.5617717302505945 );

	// lights
	const ambientLight = new AmbientLight( 0xffffff, 0.25 );
	const dirLight = new DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 1, 1, 1 );
	camera.add( ambientLight, dirLight, dirLight.target );
	scene.add( camera );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;

	terrainTiles = new TilesRenderer();
	terrainTiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '1', autoRefreshToken: true } ) );
	terrainTiles.registerPlugin( new TilesFadePlugin() );
	terrainTiles.registerPlugin( new ImageOverlayPlugin( {
		renderer,
		overlays: [ new CesiumIonOverlay( {
			assetId: '2',
			apiToken: import.meta.env.VITE_ION_KEY,
		} ) ],
	} ) );
	terrainTiles.group.rotation.x = - Math.PI / 2;
	scene.add( terrainTiles.group );

	plateauTiles = new TilesRenderer();
	plateauTiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2602291', autoRefreshToken: true } ) );
	plateauTiles.registerPlugin( new TilesFadePlugin() );
	plateauTiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader(),
		ktxLoader: new KTX2Loader().detectSupport( renderer ),
	} ) );
	plateauTiles.group.rotation.x = - Math.PI / 2;
	scene.add( plateauTiles.group );

	// raise the byte cache so tiles aren't evicted too aggressively while panning the city
	DEFAULT_LRU_CACHE.minBytesSize = 5e8;
	DEFAULT_LRU_CACHE.maxBytesSize = 1e9;

	// raise the concurrent download / parse limits so tiles stream in faster. These queues are shared
	// across all tiles renderers, so setting them once covers both the terrain and PLATEAU renderers.
	DEFAULT_DOWNLOAD_QUEUE.maxJobs = 50;
	DEFAULT_PARSE_QUEUE.maxJobs = 10;

	// both datasets share the ellipsoid frame; drive the controls from the terrain
	controls.setEllipsoid( terrainTiles.ellipsoid, terrainTiles.group );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'plateauErrorTarget', 1, 30, 1 ).name( 'PLATEAU error' );
	gui.add( params, 'terrainErrorTarget', 1, 40, 1 ).name( 'terrain error' );

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

	terrainTiles.errorTarget = params.terrainErrorTarget;
	plateauTiles.errorTarget = params.plateauErrorTarget;

	// update both tile sets against the shared camera
	for ( const tiles of [ terrainTiles, plateauTiles ] ) {

		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.setCamera( camera );
		tiles.update();

	}

	renderer.render( scene, camera );

}
