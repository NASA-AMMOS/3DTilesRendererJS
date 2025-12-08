import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, XYZTilesPlugin, } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let controls, scene, renderer;
let tiles, camera;

const params = {

	errorTarget: 1,
	planar: false,

};

// throttled render function
const scheduleRender = throttle( render );

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
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 );

	initTiles();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// gui initialization
	const gui = new GUI();
	gui.add( params, 'planar' ).onChange( initTiles );
	gui.add( params, 'errorTarget', 1, 40 ).onChange( () => {

		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;
		scheduleRender();

	} );

	gui.open();

}

function initTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	if ( controls ) {

		controls.dispose();

	}

	// tiles
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin( { maximumFadeOutTiles: 200 } ) );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new XYZTilesPlugin( {
		center: true,
		shape: params.planar ? 'planar' : 'ellipsoid',
		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
	} ) );

	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.parseQueue.maxJobs = 3;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( params.planar ) {

		// create the controls
		controls = new EnvironmentControls( scene, camera, renderer.domElement );
		controls.enableDamping = true;
		controls.minDistance = 1e-4;
		controls.maxDistance = 5;
		controls.cameraRadius = 0;
		controls.fallbackPlane.normal.set( 0, 0, 1 );
		controls.up.set( 0, 0, 1 );
		controls.camera.position.set( 0, 0, 2 );
		controls.camera.quaternion.identity();

		// reset the camera
		camera.near = 1e-4;
		camera.far = 10;
		camera.updateProjectionMatrix();

	} else {

		// init tiles
		tiles.group.rotation.x = - Math.PI / 2;

		// create the controls
		controls = new GlobeControls( scene, camera, renderer.domElement );
		controls.setEllipsoid( tiles.ellipsoid, tiles.group );
		controls.enableDamping = true;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		controls.camera.quaternion.identity();
		controls.minDistance = 150;

	}

	// listen to events to call render() on change
	controls.addEventListener( 'change', scheduleRender );
	controls.addEventListener( 'end', scheduleRender );
	tiles.addEventListener( 'needs-render', scheduleRender );
	tiles.addEventListener( 'needs-update', scheduleRender );

	render();

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	scheduleRender();

}

function render() {

	controls.update();
	camera.updateMatrixWorld();

	tiles.errorTarget = params.errorTarget;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}

function throttle( callback ) {

	let scheduled = false;
	return () => {

		if ( ! scheduled ) {

			scheduled = true;
			requestAnimationFrame( () => {

				scheduled = false;
				callback();

			} );

		}

	};

}
