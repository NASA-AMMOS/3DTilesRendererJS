import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	OrthographicCamera,
} from 'three';
import { TilesRenderer, CameraTransitionManager, GlobeControls } from '3d-tiles-renderer';
import { BatchedTilesPlugin, CesiumIonAuthPlugin, TilesFadePlugin, TMSTilesPlugin, XYZTilesPlugin, } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// DeepZoomImagePlugin

let controls, scene, renderer;
let tiles, transition;

const params = {

	errorTarget: 1,
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
	transition.camera.position.set( 0, 0, 150 );
	transition.camera.lookAt( 0, 0, 0 );
	transition.autoSync = false;
	transition.addEventListener( 'camera-change', ( { camera, prevCamera } ) => {

		tiles.deleteCamera( prevCamera );
		tiles.setCamera( camera );
		controls.setCamera( camera );

	} );

	// tiles
	tiles = new TilesRenderer( 'https://openseadragon.github.io/example-images/duomo/duomo.dzi' );
	// tiles.registerPlugin( new DeepZoomImagePlugin( { center: true } ) );


	tiles = new TilesRenderer( 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' );
	tiles.registerPlugin( new XYZTilesPlugin( { center: true, shape: 'ellipsoid' } ) );
	// tiles.registerPlugin( new TMSTilesPlugin( { center: true } ) );
	// tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '3954', autoRefreshToken: true } ) );
	// tiles.registerPlugin( new DebugTilesPlugin( { displayRegionBounds: true, displayParentBounds: false } ) );

	// tiles.group.scale.setScalar( 1e-6 );
	tiles.maxDepth = 5;
	tiles.errorTarget = 0;
	tiles.group.rotation.x = - Math.PI / 2;

	// 3812
	// tiles.registerPlugin( new TilesFadePlugin( { maximumFadeOutTiles: 10000 } ) );
	// tiles.registerPlugin( new BatchedTilesPlugin( { renderer } ) );
	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.setCamera( transition.camera );
	scene.add( tiles.group );

	window.TILES = tiles;

	// controls
	controls = new GlobeControls( scene, transition.camera, renderer.domElement );
	controls.setTilesRenderer( tiles );
	controls.enableDamping = true;
	transition.camera.position.z = 1.75 * 1e7;

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

	gui.add( params, 'errorTarget', 0, 100 );

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

	// tiles.errorTarget = params.errorTarget;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
