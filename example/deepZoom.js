import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	OrthographicCamera,
	Group,
} from 'three';
import { TileCompressionPlugin, DebugTilesPlugin } from '3d-tiles-renderer/plugins';
import { EnvironmentControls, TilesRenderer, CameraTransitionManager } from '3d-tiles-renderer';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { DeepZoomImagesPlugin } from '../src/plugins/three/DeepZoomImagesPlugin';

let controls, scene, renderer;
let tiles, tilesParent, transition;

const params = {

	reinstantiateTiles,
	errorTarget: 12,
	renderScale: 1,

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
	transition.camera.position.set( 2, 4, 2 );
	transition.camera.lookAt( 0, 0, 0 );
	transition.autoSync = false;

	// controls
	controls = new EnvironmentControls( scene, transition.camera, renderer.domElement );
	controls.minZoomDistance = 2;
	controls.minDistance = 0;
	controls.cameraRadius = 0;

	// tiles parent group
	tilesParent = new Group();
	tilesParent.rotation.set( - Math.PI / 2, 0, 0 );
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
	fadeFolder.add( params, 'errorTarget', 0, 1000 );
	fadeFolder.add( params, 'renderScale', 0.1, 1.0, 0.05 ).onChange( v => renderer.setPixelRatio( v * window.devicePixelRatio ) );

	gui.open();

}

function reinstantiateTiles() {

	if ( tiles ) {

		tiles.dispose();
		tiles.group.removeFromParent();

	}

	// tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	tiles = new TilesRenderer( 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi' );
	tiles.registerPlugin( new DeepZoomImagesPlugin() );
	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new DebugTilesPlugin( { displayBoxBounds: true } ) );
	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.errorTarget = 12;
	tiles.setCamera( transition.camera );
	tilesParent.add( tiles.group );

	window.TILES = tiles;

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

	tiles.errorTarget = params.errorTarget;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
