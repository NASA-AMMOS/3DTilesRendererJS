import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, WMTSTilesPlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const SOURCES = {
	'NASA GIBS': {
		url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi',
		layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
		tileMatrixSet: '250m',
		style: 'default',
		projection: 'EPSG:4326',
		tileDimension: 512,
		levels: 9,
		dimensions: { TIME: '2013-06-16' },
	},
	'ArcGIS World Imagery': {
		url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/WMTS',
		layer: 'World_Imagery',
		tileMatrixSet: 'default028mm',
		projection: 'EPSG:3857',
		format: 'image/jpeg',
		levels: 19,
	},
};

let controls, scene, renderer;
let tiles, camera, gui;

const params = {
	planar: false,
	source: 'NASA GIBS',
};

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

	buildGUI();
	rebuildTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

}

function buildGUI() {

	gui = new GUI();
	gui.add( params, 'planar' ).onChange( rebuildTiles );
	gui.add( params, 'source', Object.keys( SOURCES ) ).onChange( rebuildTiles );

}

function rebuildTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	if ( controls ) {

		controls.dispose();
		controls = null;

	}

	const sourceConfig = SOURCES[ params.source ];

	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new WMTSTilesPlugin( {
		shape: params.planar ? 'planar' : 'ellipsoid',
		center: true,
		...sourceConfig,
	} ) );

	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( params.planar ) {

		controls = new EnvironmentControls( scene, camera, renderer.domElement );
		controls.enableDamping = true;
		controls.minDistance = 1e-4;
		controls.maxDistance = 5;
		controls.cameraRadius = 0;
		controls.fallbackPlane.normal.set( 0, 0, 1 );
		controls.up.set( 0, 0, 1 );
		controls.camera.position.set( 0, 0, 2 );
		controls.camera.quaternion.identity();

		camera.near = 1e-4;
		camera.far = 10;
		camera.updateProjectionMatrix();

	} else {

		tiles.group.rotation.x = - Math.PI / 2;

		controls = new GlobeControls( scene, camera, renderer.domElement );
		controls.setEllipsoid( tiles.ellipsoid, tiles.group );
		controls.enableDamping = true;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		controls.camera.quaternion.identity();
		controls.minDistance = 150;

	}

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	if ( controls ) {

		controls.update();
		camera.updateMatrixWorld();

	}

	if ( tiles ) {

		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	}

	renderer.render( scene, camera );

}
