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

// throttled render callback to maximum of 50 FPS
const render$ = throttle( render, 20 );

const params = {

	errorTarget: window.devicePixelRatio,
	planar: false,

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
	tiles = new TilesRenderer( 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' );
	tiles.registerPlugin( new TilesFadePlugin( { maximumFadeOutTiles: 200 } ) );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new XYZTilesPlugin( {
		center: true,
		shape: params.planar ? 'planar' : 'ellipsoid',
	} ) );

	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.parseQueue.maxJobs = 3;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( params.planar ) {

		// init tiles
		tiles.errorTarget = 1;

		// create the controls
		controls = new EnvironmentControls( scene, camera, renderer.domElement );
		controls.setTilesRenderer( tiles );
		controls.enableDamping = true;
		controls.minZoomDistance = 2;
		controls.minDistance = 0.01;
		controls.maxDistance = 5000;
		controls.cameraRadius = 0;
		controls.fallbackPlane.normal.set( 0, 0, 1 );
		controls.up.set( 0, 0, 1 );
		controls.camera.position.set( 0, 0, 2000 );
		controls.camera.quaternion.identity();

		// reset the camera
		camera.near = 0.001;
		camera.far = 10000;
		camera.updateProjectionMatrix();

	} else {

		// init tiles
		tiles.group.rotation.x = - Math.PI / 2;

		// create the controls
		controls = new GlobeControls( scene, camera, renderer.domElement );
		controls.setTilesRenderer( tiles );
		controls.enableDamping = true;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		controls.camera.quaternion.identity();
		controls.minDistance = 150;

	}

	// listen to events to call render() on change
	controls.addEventListener( 'change', render$ );
	controls.addEventListener( 'end', render$ );
	tiles.addEventListener( 'load-model', render$ );
	tiles.addEventListener( 'force-rerender', render$ );

	// workaround for initial loading
	tiles.addEventListener( 'load-tile-set', render );
	
	render();

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	render$();

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

function throttle(
	callback,
	delay,
	leading = false,
	trailing = true,
) {

	let timeout;
	let previous = 0;

	const later = () => {

		previous = leading === false ? 0 : new Date().getTime();
		timeout = undefined;
		callback();

	};

	return () => {

		const now = new Date().getTime();

		if ( ! previous && leading === false ) {

			previous = now;

		}

		const remaining = delay - ( now - previous );

		if ( remaining <= 0 || remaining > delay ) {

			if ( timeout ) {

				clearTimeout( timeout );
				timeout = undefined;

			}

			previous = now;

			callback();

		} else if ( ! timeout && trailing !== false ) {

			timeout = window.setTimeout( later, remaining );

		}

	};

}
