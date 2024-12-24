import { TilesRenderer, EnvironmentControls } from '3d-tiles-renderer';
import { DebugTilesPlugin } from '3d-tiles-renderer/plugins';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
	FogExp2,
} from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer;
let groundTiles, skyTiles;

const params = {

	errorTarget: 12,
	displayBoxBounds: false,
	fog: false,

};

init();
render();

function init() {

	const fog = new FogExp2( 0xd8cec0, .0075, 250 );
	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xd8cec0 );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 20, 10, 20 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.minZoomDistance = 2;
	controls.cameraRadius = 1;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	const tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	groundTiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	groundTiles.registerPlugin( new DebugTilesPlugin() );
	groundTiles.fetchOptions.mode = 'cors';
	groundTiles.lruCache.minSize = 900;
	groundTiles.lruCache.maxSize = 1300;
	groundTiles.errorTarget = 12;

	skyTiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.registerPlugin( new DebugTilesPlugin() );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = groundTiles.lruCache;

	tilesParent.add( groundTiles.group, skyTiles.group );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	const gui = new GUI();
	gui.add( params, 'fog' ).onChange( v => {

		scene.fog = v ? fog : null;

	} );

	gui.add( params, 'displayBoxBounds' );
	gui.add( params, 'errorTarget', 0, 100 );
	gui.open();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function render() {

	requestAnimationFrame( render );

	controls.update();
	camera.updateMatrixWorld();

	groundTiles.errorTarget = params.errorTarget;
	groundTiles.getPluginByName( 'DEBUG_TILES_PLUGIN' ).displayBoxBounds = params.displayBoxBounds;
	skyTiles.getPluginByName( 'DEBUG_TILES_PLUGIN' ).displayBoxBounds = params.displayBoxBounds;

	groundTiles.setCamera( camera );
	groundTiles.setResolutionFromRenderer( camera, renderer );
	groundTiles.update();

	skyTiles.setCamera( camera );
	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.update();

	renderer.render( scene, camera );

}
