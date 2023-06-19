import { GeoUtils, WGS84_ELLIPSOID, GoogleTilesRenderer } from '../src/index.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	MathUtils,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from './src/lib/OrbitControls.js';

let camera, controls, scene, renderer, tiles;

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;

const params = {

	'apiKey': 'put-your-api-key-here',
	'reload': reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new GoogleTilesRenderer( params.apiKey );
	tiles.setLatLonToYUp( 35.3606 * MathUtils.DEG2RAD, 138.7274 * MathUtils.DEG2RAD ); // Mt Fuji
	tiles.setLatLonToYUp( 48.8584 * MathUtils.DEG2RAD, 2.2945 * MathUtils.DEG2RAD ); // Eiffel Tower
	tiles.setLatLonToYUp( 35.6586 * MathUtils.DEG2RAD, 139.7454 * MathUtils.DEG2RAD ); // Tokyo Tower

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );

	tiles.manager.addHandler( /\.gltf$/, loader );
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 100, 1600000 );
	camera.position.set( 1e3, 1e3, 1e3 ).multiplyScalar( 0.5 );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 500;
	controls.maxDistance = 1e4 * 2;
	controls.minPolarAngle = 0;
	controls.maxPolarAngle = 3 * Math.PI / 8;
	controls.enableDamping = true;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;
	controls.enablePan = false;

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const mapsOptions = gui.addFolder( 'Google Tiles' );
	mapsOptions.add( params, 'apiKey' );
	mapsOptions.add( params, 'reload' );
	mapsOptions.open();

	// run hash functions
	initFromHash();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );

}

function initFromHash() {

	const hash = window.location.hash.replace( /^#/, '' );
	const tokens = hash.split( /,/g ).map( t => parseFloat( t ) );
	if ( tokens.length !== 2 || tokens.findIndex( t => Number.isNaN( t ) ) !== - 1 ) {

		return;

	}

	const [ lat, lon ] = tokens;
	WGS84_ELLIPSOID.getCartographicToPosition( lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD, 0, controls.target );

	tiles.group.updateMatrixWorld();
	controls.target.applyMatrix4( tiles.group.matrixWorld );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	controls.update();

	// update options
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// update tiles
	camera.updateMatrixWorld();
	tiles.update();

	render();

}

function render() {

	// render primary view
	renderer.render( scene, camera );

	if ( tiles ) {

		const mat = tiles.group.matrixWorld.clone().invert();
		const vec = camera.position.clone().applyMatrix4( mat );

		const res = {};
		WGS84_ELLIPSOID.getPositionToCartographic( vec, res );
		document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + tiles.getCreditsString();

	}

}
