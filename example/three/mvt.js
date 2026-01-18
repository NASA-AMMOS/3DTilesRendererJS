import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	GridHelper,
	AxesHelper,
	TextureLoader,
	PlaneGeometry,
	MeshBasicMaterial,
	Mesh,
	SRGBColorSpace,
	FrontSide
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MVTLoader } from '../../src/three/renderer/loaders/MVTLoader.js';
import { MVTImageSource } from '../../src/three/plugins/images/sources/MVTImageSource.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// --- Configuration & State ---
const CONFIG = {
	TILE_SIZE: 4096,
	PBF_PATH: '../data/14-8801-5371.vector.pbf',
	EXPECTED_PNG_PATH: '/images/14-8801-5371.vector-expected.png'
};

const state = {
	showExpected: true,
	showGeneratedTexture: false,
	showMeshScene: true,
};

const layers = {
	expectedPlane: null,
	generatedPlane: null,
	meshGroup: null
};

let scene, renderer, camera, controls, gui;

// --- Initialization ---
init();
setupGUI();
loadData();
render();

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100000 );
	camera.position.set( 2048, 4000, 4000 );

	const grid = new GridHelper( CONFIG.TILE_SIZE, 8, 0xff0000, 0x444444 );
	grid.position.set( 2048, 0, 2048 );
	scene.add( grid );

	scene.add( new AxesHelper( 500 ) );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 2048, 0, 2048 );
	controls.update();

	window.addEventListener( 'resize', onWindowResize, false );

}

// --- Loading Logic ---
async function loadData() {

	const textureLoader = new TextureLoader();
	const mvtLoader = new MVTLoader();
	const imageSource = new MVTImageSource();

	// 1. Load Expected PNG Reference
	textureLoader.load( CONFIG.EXPECTED_PNG_PATH, ( texture ) => {

		texture.colorSpace = SRGBColorSpace;
		layers.expectedPlane = createDisplayPlane( texture, - 5 );
		layers.expectedPlane.visible = state.showExpected;
		scene.add( layers.expectedPlane );

	} );

	// 2. Load Generated Texture from PBF
	try {

		const res = await imageSource.fetchData( CONFIG.PBF_PATH );
		const buffer = await res.arrayBuffer();
		const texture = await imageSource.processBufferToTexture( buffer );

		layers.generatedPlane = createDisplayPlane( texture, - 2 );
		layers.generatedPlane.visible = state.showGeneratedTexture;
		scene.add( layers.generatedPlane );

	} catch ( err ) {

		console.error( 'Error generating texture:', err );

	}

	// 3. Load 3D Mesh Scene
	try {

		const result = await mvtLoader.loadAsync( CONFIG.PBF_PATH );
		layers.meshGroup = result.scene;
		layers.meshGroup.rotation.x = - Math.PI / 2;
		layers.meshGroup.visible = state.showMeshScene;
		scene.add( layers.meshGroup );

	} catch ( err ) {

		console.error( 'Error loading MVT Mesh:', err );

	}

}

/**
 * Helper to create a flat plane for textures
 */
function createDisplayPlane( texture, yOffset ) {

	const geometry = new PlaneGeometry( CONFIG.TILE_SIZE, CONFIG.TILE_SIZE );
	const material = new MeshBasicMaterial( {
		map: texture,
		side: FrontSide,
		transparent: true,
		opacity: 0.7
	} );
	const plane = new Mesh( geometry, material );
	plane.rotation.x = - Math.PI / 2;
	plane.position.set( CONFIG.TILE_SIZE / 2, yOffset, CONFIG.TILE_SIZE / 2 );
	return plane;

}

// --- GUI Setup ---
function setupGUI() {

	gui = new GUI();

	gui.add( state, 'showExpected' ).name( 'Expected PNG' ).onChange( v => {

		if ( layers.expectedPlane ) layers.expectedPlane.visible = v;

	} );

	gui.add( state, 'showGeneratedTexture' ).name( 'Generated Texture' ).onChange( v => {

		if ( layers.generatedPlane ) layers.generatedPlane.visible = v;

	} );

	gui.add( state, 'showMeshScene' ).name( 'MVT Mesh Scene' ).onChange( v => {

		if ( layers.meshGroup ) layers.meshGroup.visible = v;

	} );

}

// --- Standard Boilerplate ---
function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );
	renderer.render( scene, camera );

}
