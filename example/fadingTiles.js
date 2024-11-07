import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	OrthographicCamera,
	Group,
} from 'three';
import { TilesFadePlugin } from './src/plugins/fade/TilesFadePlugin.js';
import { EnvironmentControls, TilesRenderer, CameraTransitionManager } from '3d-tiles-renderer';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let controls, scene, renderer;
let groundTiles, skyTiles, tilesParent, transition;

const params = {

	reinstantiateTiles,
	fadeRootTiles: false,
	useFade: true,
	errorTarget: 12,
	fadeDuration: 0.5,
	renderScale: 1,
	fadingGroundTiles: '0 tiles',

	orthographic: false,
	transitionDuration: 0.25,

};

init();
render();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xd8cec0 );

	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// set up cameras and ortho / perspective transition
	transition = new CameraTransitionManager(
		new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.25, 4000 ),
		new OrthographicCamera( - 1, 1, 1, - 1, 0, 4000 ),
	);
	transition.camera.position.set( 20, 10, 20 );
	transition.camera.lookAt( 0, 0, 0 );
	transition.autoSync = false;

	transition.addEventListener( 'camera-change', ( { camera, prevCamera } ) => {

		skyTiles.deleteCamera( prevCamera );
		groundTiles.deleteCamera( prevCamera );

		skyTiles.setCamera( camera );
		groundTiles.setCamera( camera );

		controls.setCamera( camera );

	} );

	// controls
	controls = new EnvironmentControls( scene, transition.camera, renderer.domElement );
	controls.minZoomDistance = 2;
	controls.cameraRadius = 1;

	// tiles parent group
	tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	// init tiles
	reinstantiateTiles();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// gui initialization
	const gui = new GUI();
	const cameraFolder = gui.addFolder( 'camera' );
	cameraFolder.add( params, 'orthographic' ).onChange( v => {

		transition.fixedPoint.copy( controls.pivotPoint );

		// adjust the camera before the transition begins
		transition.syncCameras();
		controls.adjustCamera( transition.perspectiveCamera );
		controls.adjustCamera( transition.orthographicCamera );
		transition.toggle();

	} );
	cameraFolder.add( params, 'transitionDuration', 0, 1.5 );

	const fadeFolder = gui.addFolder( 'fade' );
	fadeFolder.add( params, 'useFade' );
	fadeFolder.add( params, 'fadeRootTiles' );
	fadeFolder.add( params, 'errorTarget', 0, 1000 );
	fadeFolder.add( params, 'fadeDuration', 0, 5 );
	fadeFolder.add( params, 'renderScale', 0.1, 1.0, 0.05 ).onChange( v => renderer.setPixelRatio( v * window.devicePixelRatio ) );

	const textController = fadeFolder.add( params, 'fadingGroundTiles' ).listen().disable();
	textController.domElement.style.opacity = 1.0;

	gui.add( params, 'reinstantiateTiles' );

	gui.open();

}

function reinstantiateTiles() {

	if ( groundTiles ) {

		groundTiles.dispose();
		groundTiles.group.removeFromParent();

		skyTiles.dispose();
		skyTiles.group.removeFromParent();

	}

	groundTiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	groundTiles.fetchOptions.mode = 'cors';
	groundTiles.lruCache.minSize = 900;
	groundTiles.lruCache.maxSize = 1300;
	groundTiles.errorTarget = 12;
	groundTiles.registerPlugin( new TilesFadePlugin() );
	groundTiles.setCamera( transition.camera );

	skyTiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = groundTiles.lruCache;
	skyTiles.registerPlugin( new TilesFadePlugin() );
	skyTiles.setCamera( transition.camera );

	tilesParent.add( groundTiles.group, skyTiles.group );

}

function onWindowResize() {

	const { perspectiveCamera, orthographicCamera } = transition;
	const aspect = window.innerWidth / window.innerHeight;

	orthographicCamera.bottom = - 40;
	orthographicCamera.top = 40;
	orthographicCamera.left = - 40 * aspect;
	orthographicCamera.right = 40 * aspect;
	orthographicCamera.updateProjectionMatrix();

	perspectiveCamera.aspect = aspect;
	perspectiveCamera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	controls.enabled = ! transition.animating;
	controls.update();

	transition.duration = 1000 * params.transitionDuration;
	transition.update();

	const camera = transition.camera;
	camera.updateMatrixWorld();

	const groundPlugin = groundTiles.getPluginByName( 'FADE_TILES_PLUGIN' );
	groundPlugin.fadeRootTiles = params.fadeRootTiles;
	groundPlugin.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	groundTiles.errorTarget = params.errorTarget;
	groundTiles.setCamera( camera );
	groundTiles.setResolutionFromRenderer( camera, renderer );
	groundTiles.update();

	const skyPlugin = skyTiles.getPluginByName( 'FADE_TILES_PLUGIN' );
	skyPlugin.fadeRootTiles = params.fadeRootTiles;
	skyPlugin.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	skyTiles.setCamera( camera );
	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.update();

	renderer.render( scene, camera );

	params.fadingGroundTiles = groundPlugin.fadingTiles + ' tiles';

}
