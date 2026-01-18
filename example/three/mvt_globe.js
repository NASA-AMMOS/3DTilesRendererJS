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
	MVTTilesPlugin,
	MVTTilesMeshPlugin
} from '3d-tiles-renderer/plugins';

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let scene, renderer, camera, controls, tiles, gui;

const apiKey = localStorage.getItem( 'mapbox_key' ) || prompt( 'Enter Mapbox API Key' );
if ( apiKey ) localStorage.setItem( 'mapbox_key', apiKey );

// --- Dynamic Filter State ---
const state = {
	pluginType: 'Mesh',
	// Layer Toggles
	showWater: true,
	showBuildings: false,
	showRoads: false,
	showTransit: false,
	showLanduse: false,
	showAdmin: true,
	showLabels: true,
	// Property Filters
	maxAdminLevel: 1,
	maxSymbolRank: 3,
	colors: {
		water: '#201f20',
		landuse: '#caedc1',
		building: '#eeeeee',
		road: '#444444',
		admin: '#ff0000',
		poi: '#ffcc00',
		default: '#222222'
	}
};

const MVT_URL = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=${apiKey}`;

init();
setupGUI();
recreateTiles();

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

function mvtFilter( feature, layerName ) {

	const props = feature.properties;

	// 1. Layer Visibility Checks
	if ( layerName === 'water' && ! state.showWater ) return false;
	if ( layerName === 'building' && ! state.showBuildings ) return false;
	if ( layerName === 'road' && ! state.showRoads ) return false;
	if ( layerName === 'transit' && ! state.showTransit ) return false;
	if ( layerName === 'landuse' && ! state.showLanduse ) return false;

	// 2. Advanced Admin Filtering
	if ( layerName === 'admin' ) {

		if ( ! state.showAdmin ) return false;
		return props.admin_level <= state.maxAdminLevel;

	}

	// 3. Label Filtering
	if ( layerName === 'place_label' ) {

		if ( ! state.showLabels ) return false;
		return props.symbolrank <= state.maxSymbolRank;

	}

	// Default: Only return true if it's one of our toggled layers
	const activeLayers = [ 'water', 'building', 'road', 'transit', 'landuse' ];
	return activeLayers.includes( layerName ) && state[ `show${layerName.charAt( 0 ).toUpperCase() + layerName.slice( 1 )}` ];

}

function recreateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );

	const pluginOptions = {
		center: true,
		shape: 'ellipsoid',
		levels: 15,
		tileDimension: 512,
		url: MVT_URL,
		styles: state.colors,
		filter: mvtFilter
	};

	if ( state.pluginType === 'Mesh' ) {

		tiles.registerPlugin( new MVTTilesMeshPlugin( pluginOptions ) );

	} else {

		tiles.registerPlugin( new MVTTilesPlugin( pluginOptions ) );

	}

	tiles.group.rotation.x = - Math.PI / 2;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( controls ) controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function setupGUI() {

	gui = new GUI();

	// Plugin Toggle
	gui.add( state, 'pluginType', [ 'Mesh', 'Texture' ] ).name( 'Renderer Mode' ).onChange( recreateTiles );

	// Layers Folder
	const layers = gui.addFolder( 'Layers' );
	const trigger = () => recreateTiles();

	layers.add( state, 'showWater' ).name( 'Water' ).onChange( trigger );
	layers.add( state, 'showBuildings' ).name( 'Buildings' ).onChange( trigger );
	layers.add( state, 'showRoads' ).name( 'Roads' ).onChange( trigger );
	layers.add( state, 'showTransit' ).name( 'Transit' ).onChange( trigger );
	layers.add( state, 'showLanduse' ).name( 'Landuse' ).onChange( trigger );
	layers.add( state, 'showAdmin' ).name( 'Admin Borders' ).onChange( trigger );
	layers.add( state, 'showLabels' ).name( 'Labels' ).onChange( trigger );

	// Details Folder
	const details = gui.addFolder( 'Filter Settings' );
	details.add( state, 'maxAdminLevel', 0, 4, 1 ).name( 'Admin Detail' ).onChange( trigger );
	details.add( state, 'maxSymbolRank', 1, 10, 1 ).name( 'Label Density' ).onChange( trigger );

	// Style Folder
	const styleFolder = gui.addFolder( 'Map Styles' );
	for ( let key in state.colors ) {

		styleFolder.addColor( state.colors, key )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( () => recreateTiles() );

	}

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
