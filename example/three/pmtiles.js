import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
} from 'three';
import {
	TilesRenderer,
	GlobeControls,
} from '3d-tiles-renderer';
import {
	UpdateOnChangePlugin,
	PMTilesPlugin,
} from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let scene, renderer, camera, controls, tiles, gui;

// Layer configuration for Protomaps v4 basemap
const LAYERS = {
	water: { enabled: true, color: '#4a90d9' },
	earth: { enabled: true, color: '#f2efe9' },
	landuse: { enabled: false, color: '#e8e4d8' },
	landcover: { enabled: false, color: '#d4e8c2' },
	natural: { enabled: false, color: '#c8d9af' },
	roads: { enabled: false, color: '#ffffff' },
	buildings: { enabled: false, color: '#d9d0c9' },
	transit: { enabled: false, color: '#888888' },
	boundaries: { enabled: true, color: '#ff6b6b' },
	places: { enabled: true, color: '#333333' },
	pois: { enabled: false, color: '#7d4e24' },
};

// Application state
const state = {
	layers: {},
	colors: {},
};

// Initialize state from layer config
for ( const key in LAYERS ) {

	state.layers[ key ] = LAYERS[ key ].enabled;
	state.colors[ key ] = LAYERS[ key ].color;

}

state.colors.default = '#cccccc';

init();
setupGUI();
createTiles();

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setAnimationLoop( render );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 100, 1e8 );

	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 1, 1 );
	scene.add( dirLight );
	scene.add( new AmbientLight( 0x444444 ) );

	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.enableDamping = true;
	controls.camera.position.set( 0, 0, 1.5 * 1e7 );

	window.addEventListener( 'resize', onWindowResize, false );

}

function createFilter() {

	return function ( feature, layerName ) {

		if ( layerName in state.layers ) {

			return state.layers[ layerName ] === true;

		}

		// Unknown layers: hide by default
		return false;

	};

}

function createTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new PMTilesPlugin( {
		url: 'https://demo-bucket.protomaps.com/v4.pmtiles',
		center: true,
		shape: 'ellipsoid',
		levels: 15,
		tileDimension: 512,
		styles: state.colors,
		filter: createFilter()
	} ) );

	tiles.group.rotation.x = - Math.PI / 2;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( controls ) controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function setupGUI() {

	gui = new GUI();

	// Layers folder
	const layersFolder = gui.addFolder( 'Layers' );
	for ( const key in LAYERS ) {

		layersFolder.add( state.layers, key )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( createTiles );

	}

	// Colors folder
	const colorsFolder = gui.addFolder( 'Colors' );
	for ( const key in LAYERS ) {

		colorsFolder.addColor( state.colors, key )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( createTiles );

	}

	colorsFolder.close();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	controls.update();
	if ( tiles ) {

		camera.updateMatrixWorld();
		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	}

	renderer.render( scene, camera );

}
