import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import {
	TilesRenderer,
	GlobeControls,
} from '3d-tiles-renderer';
import {
	UpdateOnChangePlugin,
	TilesFadePlugin,
	XYZTilesPlugin,
	ImageOverlayPlugin,
	PMTilesOverlay,
} from '3d-tiles-renderer/plugins';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

// Layer config for Protomaps v4 basemap — colors from the Protomaps "Light" theme
const LAYERS = {
	earth: { enabled: true, color: '#e2dfda' },
	water: { enabled: true, color: '#80deea' },
	landcover: { enabled: true, color: '#c4e7d2' },
	landuse: { enabled: true, color: '#cfddd5' },
	natural: { enabled: true, color: '#e2e0d7' },
	buildings: { enabled: true, color: '#cccccc' },
	roads: { enabled: true, color: '#ebebeb' },
	transit: { enabled: true, color: '#a7b1b3' },
	boundaries: { enabled: true, color: '#adadad' },
	places: { enabled: true, color: '#5c5c5c' },
	pois: { enabled: true, color: '#1a8cbd' },
};

const state = {
	layers: {},
	colors: {},
};

for ( const key in LAYERS ) {

	state.layers[ key ] = LAYERS[ key ].enabled;
	state.colors[ key ] = LAYERS[ key ].color;

}

state.colors.default = '#cccccc';

let scene, renderer, camera, controls, tiles, overlay, overlayPlugin;

init();
render();

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	renderer.setAnimationLoop( render );
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 );

	// Base tile layer: XYZ raster tiles provide the globe geometry
	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new XYZTilesPlugin( {
		center: true,
		shape: 'ellipsoid',
		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
	} ) );

	tiles.setCamera( camera );
	tiles.group.rotation.x = - Math.PI / 2;
	tiles.group.updateMatrixWorld();
	scene.add( tiles.group );

	// PMTiles overlay: vector tile data composited on top of the base geometry
	overlay = createOverlay();
	overlayPlugin = new ImageOverlayPlugin( { overlays: [ overlay ], renderer } );
	tiles.registerPlugin( overlayPlugin );

	// Controls
	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );
	controls.enableDamping = true;
	controls.camera.position.set( 0, 0, 1.5e7 );

	window.addEventListener( 'resize', onWindowResize );

	setupGUI();

}

function createOverlay() {

	return new PMTilesOverlay( {
		url: 'https://demo-bucket.protomaps.com/v4.pmtiles',
		styles: { ...state.colors },
		filter: ( _feature, layerName ) => state.layers[ layerName ] ?? false,
	} );

}

function updateOverlay() {

	overlay.setStyles( state.colors, ( _feature, layerName ) => state.layers[ layerName ] ?? false );
	overlay.redraw();

}

function setupGUI() {

	const gui = new GUI();

	const layersFolder = gui.addFolder( 'Layers' );
	for ( const key in LAYERS ) {

		layersFolder.add( state.layers, key )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( updateOverlay );

	}

	const colorsFolder = gui.addFolder( 'Colors' );
	for ( const key in LAYERS ) {

		colorsFolder.addColor( state.colors, key )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( updateOverlay );

	}

	colorsFolder.close();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	if ( controls ) controls.update();

	if ( tiles ) {

		camera.updateMatrixWorld();
		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	}

	renderer.render( scene, camera );

}
