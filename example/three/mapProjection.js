import {
	EnvironmentControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	CesiumIonAuthPlugin,
	GLTFExtensionsPlugin,
	TileCompressionPlugin,
	TilesFadePlugin,
	UnloadTilesPlugin,
	UpdateOnChangePlugin,
} from '3d-tiles-renderer/plugins';
import {
	MathUtils,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { MapProjectionPlugin } from './src/plugins/MapProjectionPlugin.js';

// the view is framed over lower Manhattan on load
const INITIAL_LAT = 40.7128 * MathUtils.DEG2RAD;
const INITIAL_LON = - 74.0060 * MathUtils.DEG2RAD;
const INITIAL_HEIGHT = 800;

let camera, controls, scene, renderer, tiles, stats;

const _target = new Vector3();

const params = {

	scheme: 'EPSG:3857',
	errorTarget: 24,

	reload: reload,

};

init();
animate();

// re-creates the tile set, keeping the camera over the same ground position. The same point maps
// to a different coordinate in each projection, so the camera has to be converted through lat /
// lon rather than left where it was.
function reload() {

	const plugin = tiles?.getPluginByName( 'MAP_PROJECTION_PLUGIN' );
	const { x, y, z } = camera.position;

	reinstantiateTiles( plugin ? plugin.unprojectPoint( x, y, z ) : null );

}

function reinstantiateTiles( cartographic = null ) {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
	// flatten the globe into the map projection. Ordering against the other plugins comes from the
	// priority it sets, not from the order it is registered in here.
	tiles.registerPlugin( new MapProjectionPlugin( { scheme: params.scheme } ) );

	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new UnloadTilesPlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader(),
	} ) );

	// the plugin produces a y-up frame so the group needs no rotation
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	frameView( cartographic );

}

// places the camera over the given lat / lon in the flattened frame, or over the initial location
// if none is given
function frameView( cartographic = null ) {

	const plugin = tiles.getPluginByName( 'MAP_PROJECTION_PLUGIN' );

	if ( cartographic ) {

		// every projection here is y-up with x running east and z running south, so the camera
		// orientation carries over and only the position has to be converted
		plugin.projectPoint( cartographic.lon, cartographic.lat, cartographic.height, camera.position );

	} else {

		plugin.projectPoint( INITIAL_LON, INITIAL_LAT, 0, _target );
		plugin.projectPoint( INITIAL_LON, INITIAL_LAT, INITIAL_HEIGHT, camera.position );

		// pull the camera back to the south so the view is angled rather than straight down
		camera.position.z += INITIAL_HEIGHT;
		camera.lookAt( _target );

	}

	camera.updateMatrixWorld();

	// the controls hold a pivot point, an up vector and inertia expressed in the previous
	// projection. Left alone they apply deltas against a pivot that can be hundreds of kilometers
	// from the camera and throw it off the map on the next interaction.
	controls.setCamera( camera );
	controls.pivotPoint.copy( camera.position );
	controls.dragInertia.setScalar( 0 );
	controls.rotationInertia.setScalar( 0 );

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

	// controls. The flattened frame is y-up, which is what the controls already assume.
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.enableDamping = true;
	controls.minDistance = 10;
	controls.cameraRadius = 5;

	// initialize tiles
	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	gui.add( params, 'scheme', [ 'EPSG:3857', 'EPSG:4326' ] ).name( 'projection' ).onChange( reload );
	gui.add( params, 'errorTarget', 5, 100, 1 ).onChange( () => {

		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'reload' );

	// stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	// ensure transforms are up to date for the controls update
	scene.updateMatrixWorld();

	controls.update();
	camera.updateMatrixWorld();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );
	tiles.errorTarget = params.errorTarget;
	tiles.update();

	renderer.render( scene, camera );
	stats.update();

	document.getElementById( 'credits' ).innerText = tiles.getAttributions()[ 0 ]?.value || '';

}

