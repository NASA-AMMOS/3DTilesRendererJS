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

let scene, renderer, camera, controls, tiles, overlay, overlayPlugin;

init();
render();

function getStyle() {

	return layerName => {

		const layer = LAYERS[ layerName ];
		if ( ! layer?.enabled ) return null;

		const { fill, stroke, radius, order } = layer;
		return { fill, stroke, order, ...( radius !== undefined && { radius } ) };

	};

}

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
	overlay = new PMTilesOverlay( {
		url: 'https://demo-bucket.protomaps.com/v4.pmtiles',
		getStyle: getStyle(),
	} );
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

function updateOverlay() {

	overlay.setStyle( getStyle() );
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
