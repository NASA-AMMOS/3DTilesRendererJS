import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import {
	TilesRenderer,
	GlobeControls,
} from '3d-tiles-renderer';
import {
	UpdateOnChangePlugin,
	TilesFadePlugin,
	ImageOverlayPlugin,
	PMTilesOverlay,
	GeneratedSurfacePlugin,
} from '3d-tiles-renderer/plugins';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

// Protomaps "Light" theme — from protomaps/basemaps flavors.ts
const LAYERS_LIGHT = {
	earth: { enabled: true, fill: '#e2dfda', order: 0 },
	water: { enabled: true, fill: '#80deea', order: 1 },
	landcover: { enabled: true, fill: '#c4e7d2', order: 2 },
	landuse: { enabled: true, fill: '#cfddd5', order: 3 },
	natural: { enabled: true, fill: '#e2e0d7', order: 4 },
	buildings: { enabled: true, fill: '#cccccc', order: 5 },
	roads: { enabled: true, stroke: '#ebebeb', order: 6 },
	transit: { enabled: true, stroke: '#a7b1b3', order: 7 },
	boundaries: { enabled: true, stroke: '#adadad', order: 8 },
	places: { enabled: true, fill: '#5c5c5c', order: 9 },
	pois: { enabled: true, fill: '#1a8cbd', radius: 3, order: 10 },
};

/*
// Protomaps "Dark" theme — from protomaps/basemaps flavors.ts
const LAYERS_DARK = {
	earth: { enabled: true, fill: '#1f1f1f', order: 0 },
	water: { enabled: true, fill: '#31353f', order: 1 },
	landcover: { enabled: true, fill: '#1c2925', order: 2 },
	landuse: { enabled: true, fill: '#1c2421', order: 3 },
	natural: { enabled: true, fill: '#212123', order: 4 },
	buildings: { enabled: true, fill: '#111111', order: 5 },
	roads: { enabled: true, stroke: '#3d3d3d', order: 6 },
	transit: { enabled: true, stroke: '#000000', order: 7 },
	boundaries: { enabled: true, stroke: '#5b6374', order: 8 },
	places: { enabled: true, fill: '#7a7a7a', order: 9 },
	pois: { enabled: true, fill: '#4299bb', radius: 3, order: 10 },
};

// Protomaps "White" theme — from protomaps/basemaps flavors.ts
const LAYERS_WHITE = {
	earth: { enabled: true, fill: '#ffffff', order: 0 },
	water: { enabled: true, fill: '#dcdcdc', order: 1 },
	landcover: { enabled: true, fill: '#fcfcfc', order: 2 },
	landuse: { enabled: true, fill: '#fcfcfc', order: 3 },
	natural: { enabled: true, fill: '#fafafa', order: 4 },
	buildings: { enabled: true, fill: '#efefef', order: 5 },
	roads: { enabled: true, stroke: '#ebebeb', order: 6 },
	transit: { enabled: true, stroke: '#d6d6d6', order: 7 },
	boundaries: { enabled: true, stroke: '#adadad', order: 8 },
	places: { enabled: true, fill: '#5c5c5c', order: 9 },
	pois: { enabled: true, fill: '#1a8cbd', radius: 3, order: 10 },
};

// Protomaps "Black" theme — from protomaps/basemaps flavors.ts
const LAYERS_BLACK = {
	earth: { enabled: true, fill: '#141414', order: 0 },
	water: { enabled: true, fill: '#333333', order: 1 },
	landcover: { enabled: true, fill: '#181818', order: 2 },
	landuse: { enabled: true, fill: '#181818', order: 3 },
	natural: { enabled: true, fill: '#161616', order: 4 },
	buildings: { enabled: true, fill: '#0a0a0a', order: 5 },
	roads: { enabled: true, stroke: '#3f3f3f', order: 6 },
	transit: { enabled: true, stroke: '#3f3f3f', order: 7 },
	boundaries: { enabled: true, stroke: '#707070', order: 8 },
	places: { enabled: true, fill: '#999999', order: 9 },
	pois: { enabled: true, fill: '#707070', radius: 3, order: 10 },
};

// Pastel theme — each layer gets a distinct hue at high lightness, moderate saturation
const LAYERS_PASTEL = {
	earth: { enabled: true, fill: '#f6f5f2', order: 0 },
	water: { enabled: true, fill: '#c2e0f4', order: 1 },
	landcover: { enabled: true, fill: '#d4ecd5', order: 2 },
	landuse: { enabled: true, fill: '#e6e4f2', order: 3 },
	natural: { enabled: true, fill: '#f3ebd1', order: 4 },
	buildings: { enabled: true, fill: '#f7e1e1', order: 5 },
	roads: { enabled: true, stroke: '#ffffff', order: 6 },
	transit: { enabled: true, stroke: '#ccbfe6', order: 7 },
	boundaries: { enabled: true, stroke: '#d9c2cd', order: 8 },
	places: { enabled: true, fill: '#5c5470', order: 9 },
	pois: { enabled: true, fill: '#e08a9b', radius: 3, order: 10 },
};

const LAYERS_RADICAL = {
	earth: { enabled: true, fill: '#0c001a', order: 0 },
	water: { enabled: true, fill: '#00f0ff', order: 1 },
	landcover: { enabled: true, fill: '#120036', order: 2 },
	landuse: { enabled: true, fill: '#ff0055', order: 3 },
	natural: { enabled: true, fill: '#00ff66', order: 4 },
	buildings: { enabled: true, fill: '#2d0066', order: 5 },
	roads: { enabled: true, stroke: '#ffdd00', order: 6 },
	transit: { enabled: true, stroke: '#ff00ff', order: 7 },
	boundaries: { enabled: true, stroke: '#00ffcc', order: 8 },
	places: { enabled: true, fill: '#ffffff', order: 9 },
	pois: { enabled: true, fill: '#ff9900', radius: 3, order: 10 },
};
*/

const LAYERS = LAYERS_LIGHT;

let scene, renderer, camera, controls, tiles, overlay;

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

	// PMTiles overlay: vector tile data composited on top of the base geometry
	overlay = new PMTilesOverlay( {
		url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
		getStyle,
	} );

	// Base tile layer: XYZ raster tiles provide the globe geometry
	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new GeneratedSurfacePlugin( {
		shape: 'ellipsoid',
	} ) );
	tiles.registerPlugin( new ImageOverlayPlugin( {
		overlays: [ overlay ],
	} ) );

	tiles.setCamera( camera );
	tiles.group.rotation.x = - Math.PI / 2;
	tiles.group.updateMatrixWorld();
	scene.add( tiles.group );

	// Controls
	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );
	controls.enableDamping = true;
	controls.camera.position.set( 0, 0, 1.5e7 );

	window.addEventListener( 'resize', onWindowResize );

	setupGUI();

}

function getStyle( layerName, properties ) {

	if ( ! ( layerName in LAYERS ) ) return null;

	const layer = LAYERS[ layerName ];
	return layer.enabled ? layer : null;

}

function updateOverlay() {

	overlay.redraw();

}

function setupGUI() {

	const gui = new GUI();

	for ( const key in LAYERS ) {

		const folder = gui.addFolder( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) );
		folder.add( LAYERS[ key ], 'enabled' ).onChange( updateOverlay );
		folder.addColor( LAYERS[ key ], LAYERS[ key ].fill !== undefined ? 'fill' : 'stroke' ).onChange( updateOverlay );
		folder.close();

	}

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	controls.update();

	camera.updateMatrixWorld();
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
