import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	OrthographicCamera,
	Group,
} from 'three';
import { FadeTilesRenderer, } from './src/FadeTilesRenderer.js';
import { EnvironmentControls } from '../src/index.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { CameraTransitionManager } from './src/CameraTransitionManager.js';

let controls, scene, renderer;
let groundTiles, skyTiles, tilesParent, transition;

const params = {

	reinstantiateTiles,
	fadeRootTiles: true,
	useFade: true,
	errorTarget: 12,
	fadeDuration: 0.5,
	renderScale: 1,
	fadingGroundTiles: '0 tiles',
	orthographic: false,

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
	transition.addEventListener( 'camera-changed', ( { camera, prevCamera } ) => {

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
	gui.add( params, 'orthographic' ).onChange( v => {

		transition.fixedPoint.copy( controls.pivotPoint );
		transition.toggle();

	} );
	gui.add( params, 'useFade' );
	gui.add( params, 'fadeRootTiles' );
	gui.add( params, 'errorTarget', 0, 1000 );
	gui.add( params, 'fadeDuration', 0, 5 );
	gui.add( params, 'renderScale', 0.1, 1.0, 0.05 ).onChange( v => renderer.setPixelRatio( v * window.devicePixelRatio ) );

	const textController = gui.add( params, 'fadingGroundTiles' ).listen().disable();
	textController.domElement.style.opacity = 1.0;

	gui.add( params, 'reinstantiateTiles' );

	gui.open();

}

function reinstantiateTiles() {

	if ( groundTiles ) {

		groundTiles.dispose();
		skyTiles.dispose();

	}

	groundTiles = new FadeTilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	groundTiles.fetchOptions.mode = 'cors';
	groundTiles.lruCache.minSize = 900;
	groundTiles.lruCache.maxSize = 1300;
	groundTiles.errorTarget = 12;
	groundTiles.setCamera( transition.camera );

	skyTiles = new FadeTilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = groundTiles.lruCache;
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

	transition.update();
	controls.enabled = ! transition.animating;
	controls.update();

	const camera = transition.camera;
	camera.updateMatrixWorld();

	groundTiles.errorTarget = params.errorTarget;
	groundTiles.fadeRootTiles = params.fadeRootTiles;
	groundTiles.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	groundTiles.setCamera( camera );
	groundTiles.setResolutionFromRenderer( camera, renderer );
	groundTiles.update();

	skyTiles.fadeRootTiles = params.fadeRootTiles;
	skyTiles.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	skyTiles.setCamera( camera );
	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.update();

	renderer.render( scene, camera );

	params.fadingGroundTiles = groundTiles.fadingTiles + ' tiles';

}
