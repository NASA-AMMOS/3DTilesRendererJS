import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import { PotreePlugin } from '3d-tiles-renderer/plugins';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

// Public Potree 2.0 dataset hosted by potree.github.io (CORS-enabled)
const POTREE_URL = 'https://raw.githubusercontent.com/potree/potree/refs/heads/develop/pointclouds/lion_takanawa/';

let camera, controls, scene, renderer, tiles;
let stats, statsContainer;
let didFitCamera = false;

const params = {
	errorTarget: 2,
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
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 1e6 );
	camera.position.set( 0, - 200, 150 );
	camera.lookAt( 0, 0, 0 );

	// orbit controls — appropriate for inspecting a local-coordinate point cloud
	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.screenSpacePanning = true;

	// tiles
	tiles = new TilesRenderer( POTREE_URL );
	tiles.registerPlugin( new PotreePlugin( { pointSize: params.pointSize } ) );
	tiles.fetchOptions.mode = 'cors';
	tiles.setCamera( camera );
	scene.add( tiles.group );

	// fit the camera to the dataset bounding box on first content load
	tiles.addEventListener( 'load-content', onFirstContentLoad );

	// stats overlay
	statsContainer = document.createElement( 'div' );
	statsContainer.style.cssText = 'position:absolute;top:0;left:0;color:white;font:12px monospace;padding:4px;pointer-events:none;';
	document.body.appendChild( statsContainer );

	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

	// gui
	const gui = new GUI();
	gui.add( params, 'errorTarget', 0, 10, 0.1 ).name( 'error target' ).onChange( v => {

		tiles.errorTarget = v;

	} );
	gui.add( params, 'pointSize', 0.1, 5, 0.1 ).name( 'point size' ).onChange( v => {

		tiles.group.traverse( c => {

			if ( c.isPoints && c.material ) c.material.size = v;

		} );

	} );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize );

}

// On the first content load, fit the camera to the root bounding box
function onFirstContentLoad() {

	if ( didFitCamera || ! tiles.root ) return;
	didFitCamera = true;
	tiles.removeEventListener( 'load-content', onFirstContentLoad );

	// Root bounding volume box: [cx, cy, cz, hx, 0, 0, 0, hy, 0, 0, 0, hz]
	const box = tiles.root.boundingVolume.box;
	if ( ! box ) return;

	const cx = box[ 0 ], cy = box[ 1 ], cz = box[ 2 ];
	const hx = box[ 3 ], hy = box[ 7 ], hz = box[ 11 ];
	const radius = Math.sqrt( hx * hx + hy * hy + hz * hz );

	controls.target.set( cx, cy, cz );
	camera.position.set( cx, cy - radius * 1.5, cz + radius * 0.8 );
	camera.near = radius * 0.001;
	camera.far = radius * 10;
	camera.updateProjectionMatrix();
	controls.update();

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
	stats.update();

	const { downloading, parsing, loaded } = tiles.stats;
	statsContainer.textContent = `tiles — loading: ${ downloading + parsing }  loaded: ${ loaded }`;

}
