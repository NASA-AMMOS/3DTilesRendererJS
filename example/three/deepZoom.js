import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	OrthographicCamera,
} from 'three';
import { EnvironmentControls, TilesRenderer, CameraTransitionManager } from '3d-tiles-renderer';
import { DeepZoomImagePlugin, UpdateOnChangePlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let controls, scene, renderer;
let tiles, transition;

const params = {

	errorTarget: 1,
	renderScale: 1,

	orthographic: false,

};

init();
render();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );

	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// set up cameras and ortho / perspective transition
	transition = new CameraTransitionManager(
		new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 ),
		new OrthographicCamera( - 1, 1, 1, - 1, 0, 4000 ),
	);
	transition.camera.position.set( 0, 0, 1.5 );
	transition.camera.lookAt( 0, 0, 0 );
	transition.autoSync = false;
	transition.addEventListener( 'camera-change', ( { camera, prevCamera } ) => {

		tiles.deleteCamera( prevCamera );
		tiles.setCamera( camera );
		controls.setCamera( camera );

	} );

	// tiles
	tiles = new TilesRenderer( 'https://openseadragon.github.io/example-images/duomo/duomo.dzi' );
	tiles.registerPlugin( new DeepZoomImagePlugin( { center: true } ) );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.errorTarget = 1;
	tiles.setCamera( transition.camera );
	scene.add( tiles.group );

	// controls
	controls = new EnvironmentControls( scene, transition.camera, renderer.domElement );
	controls.minZoomDistance = 2;
	controls.minDistance = 0.01;
	controls.maxDistance = 1000;
	controls.cameraRadius = 0;
	controls.enableDamping = true;
	controls.fallbackPlane.normal.set( 0, 0, 1 );
	controls.up.set( 0, 0, 1 );

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// gui initialization
	const gui = new GUI();
	gui.add( params, 'orthographic' ).onChange( v => {

		transition.fixedPoint.copy( controls.pivotPoint );

		// adjust the camera before the transition begins
		transition.syncCameras();
		controls.adjustCamera( transition.perspectiveCamera );
		controls.adjustCamera( transition.orthographicCamera );
		transition.toggle();

	} );

	gui.add( params, 'errorTarget', 0, 100 ).onChange( () => {

		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'renderScale', 0.1, 1.0, 0.05 ).onChange( v => renderer.setPixelRatio( v * window.devicePixelRatio ) );

	gui.open();

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
	transition.update();

	const camera = transition.camera;
	camera.updateMatrixWorld();

	tiles.errorTarget = params.errorTarget;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
