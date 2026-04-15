import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { PotreePlugin } from './src/plugins/PotreePlugin.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Public Potree 2.0 dataset hosted by potree.github.io (CORS-enabled)
const POTREE_URL = 'https://raw.githubusercontent.com/potree/potree/refs/heads/develop/pointclouds/lion_takanawa/cloud.js';

let camera, controls, scene, renderer, tiles;

const params = {
	errorTarget: 16,
	pointSize: 1,
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

	// camera — near/far span needs to cover the point cloud; will be adjusted once loaded
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( 4, 2, 8 );
	camera.lookAt( 0, 0, 0 );

	// orbit controls — appropriate for inspecting a local-coordinate point cloud
	controls = new OrbitControls( camera, renderer.domElement );

	// tiles
	tiles = new TilesRenderer( POTREE_URL );
	tiles.registerPlugin( new PotreePlugin() );
	tiles.errorTarget = params.errorTarget;
	tiles.setCamera( camera );
	tiles.group.rotation.x = - Math.PI / 2;
	tiles.group.position.y = - 5;
	scene.add( tiles.group );

	tiles.addEventListener( 'load-model', ( { scene } ) => {

		scene.traverse( c => {

			if ( c.isPoints && c.material ) {

				c.material.size = params.pointSize;

			}

		} );

	} );

	// gui
	const gui = new GUI();
	gui.add( params, 'errorTarget', 0, 50, 0.1 ).name( 'error target' ).onChange( v => {

		tiles.errorTarget = v;

	} );
	gui.add( params, 'pointSize', 1, 20 ).name( 'point size' ).onChange( v => {

		tiles.forEachLoadedModel( scene => {

			scene.traverse( c => {

				if ( c.isPoints && c.material ) {

					c.material.size = v;

				}

			} );

		} );

	} );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	controls.update();

	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
