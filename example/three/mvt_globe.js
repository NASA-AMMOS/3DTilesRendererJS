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
	MVTTilesMeshPlugin,
	PMTilesPlugin,
	PMTilesMeshPlugin
} from '3d-tiles-renderer/plugins';

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let scene, renderer, camera, controls, tiles, gui;
let layersFolder = null;
let colorsFolder = null;

// --- Source Presets ---
// Each provider has different layer names and styling conventions
const SOURCE_PRESETS = {
	PMTiles: {
		name: 'Protomaps PMTiles',
		url: 'https://demo-bucket.protomaps.com/v4.pmtiles',
		requiresApiKey: false,
		// Protomaps layer names (v4 basemap)
		layers: {
			water: { name: 'water', enabled: true, color: '#4a90d9' },
			earth: { name: 'earth', enabled: true, color: '#f2efe9' },
			landuse: { name: 'landuse', enabled: false, color: '#e8e4d8' },
			landcover: { name: 'landcover', enabled: false, color: '#d4e8c2' },
			natural: { name: 'natural', enabled: false, color: '#c8d9af' },
			roads: { name: 'roads', enabled: false, color: '#ffffff' },
			buildings: { name: 'buildings', enabled: false, color: '#d9d0c9' },
			transit: { name: 'transit', enabled: false, color: '#888888' },
			boundaries: { name: 'boundaries', enabled: true, color: '#ff6b6b' },
			places: { name: 'places', enabled: true, color: '#333333' },
			pois: { name: 'pois', enabled: false, color: '#7d4e24' },
		},
		defaultColor: '#cccccc'
	},
	MVT: {
		name: 'Mapbox Streets',
		urlTemplate: 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=',
		requiresApiKey: true,
		// Mapbox Streets v8 layer names
		layers: {
			water: { name: 'water', enabled: true, color: '#4a90d9' },
			waterway: { name: 'waterway', enabled: true, color: '#4a90d9' },
			landuse: { name: 'landuse', enabled: false, color: '#e8e4d8' },
			landuse_overlay: { name: 'landuse_overlay', enabled: false, color: '#d4e8c2' },
			park: { name: 'park', enabled: false, color: '#c8d9af' },
			natural_label: { name: 'natural_label', enabled: false, color: '#5d8a3e' },
			road: { name: 'road', enabled: false, color: '#ffffff' },
			building: { name: 'building', enabled: false, color: '#d9d0c9' },
			transit: { name: 'transit', enabled: false, color: '#888888' },
			boundaries: { name: 'admin', enabled: true, color: '#ff6b6b' },
			place_label: { name: 'place_label', enabled: true, color: '#333333' },
			poi_label: { name: 'poi_label', enabled: false, color: '#7d4e24' },
		},
		defaultColor: '#cccccc'
	}
};

// Mapbox API key - stored in localStorage for convenience
let apiKey = localStorage.getItem( 'mapbox_key' ) || '';

// --- Application State ---
const state = {
	sourceType: 'PMTiles',
	renderMode: 'Texture',
	// Layer visibility (populated from preset)
	layers: {},
	// Layer colors (populated from preset)
	colors: {},
	// Filter settings
	maxSymbolRank: 3,
};

// Initialize state from default preset
function initStateFromPreset( presetName ) {

	const preset = SOURCE_PRESETS[ presetName ];
	state.layers = {};
	state.colors = {};

	for ( const key in preset.layers ) {

		const layer = preset.layers[ key ];
		state.layers[ key ] = layer.enabled;
		state.colors[ layer.name ] = layer.color;

	}

	state.colors.default = preset.defaultColor;

}

initStateFromPreset( state.sourceType );

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

function createFilter( preset ) {

	const layerNameToKey = {};
	for ( const key in preset.layers ) {

		layerNameToKey[ preset.layers[ key ].name ] = key;

	}

	return function ( feature, layerName ) {

		const key = layerNameToKey[ layerName ];

		// If layer is known, check if enabled
		if ( key !== undefined ) {

			return state.layers[ key ] === true;

		}

		// Unknown layers: hide by default (log for debugging)
		console.log( 'Unknown layer:', layerName );
		return false;

	};

}

function recreateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();

	}

	const preset = SOURCE_PRESETS[ state.sourceType ];

	// Check if API key is needed
	if ( preset.requiresApiKey && ! apiKey ) {

		apiKey = prompt( `Enter API Key for ${preset.name}:` );
		if ( apiKey ) {

			localStorage.setItem( 'mapbox_key', apiKey );

		} else {

			// Fall back to PMTiles if no key provided
			state.sourceType = 'PMTiles';
			initStateFromPreset( 'PMTiles' );
			rebuildGUI();
			recreateTiles();
			return;

		}

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );

	const pluginOptions = {
		center: true,
		shape: 'ellipsoid',
		levels: 15,
		tileDimension: 512,
		styles: state.colors,
		filter: createFilter( preset )
	};

	// Select plugin based on source type and render mode
	if ( state.sourceType === 'PMTiles' ) {

		pluginOptions.url = preset.url;

		if ( state.renderMode === 'Mesh' ) {

			tiles.registerPlugin( new PMTilesMeshPlugin( pluginOptions ) );

		} else {

			tiles.registerPlugin( new PMTilesPlugin( pluginOptions ) );

		}

	} else {

		pluginOptions.url = preset.urlTemplate + apiKey;

		if ( state.renderMode === 'Mesh' ) {

			tiles.registerPlugin( new MVTTilesMeshPlugin( pluginOptions ) );

		} else {

			tiles.registerPlugin( new MVTTilesPlugin( pluginOptions ) );

		}

	}

	tiles.group.rotation.x = - Math.PI / 2;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( controls ) controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function rebuildGUI() {

	// Remove old folders if they exist
	if ( layersFolder ) {

		layersFolder.destroy();
		layersFolder = null;

	}

	if ( colorsFolder ) {

		colorsFolder.destroy();
		colorsFolder = null;

	}

	const preset = SOURCE_PRESETS[ state.sourceType ];

	// Rebuild layers folder
	layersFolder = gui.addFolder( 'Layers' );
	for ( const key in preset.layers ) {

		const layer = preset.layers[ key ];
		layersFolder.add( state.layers, key )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( recreateTiles );

	}

	// Rebuild colors folder
	colorsFolder = gui.addFolder( 'Colors' );
	for ( const key in preset.layers ) {

		const layer = preset.layers[ key ];
		colorsFolder.addColor( state.colors, layer.name )
			.name( key.charAt( 0 ).toUpperCase() + key.slice( 1 ) )
			.onChange( recreateTiles );

	}

}

function setupGUI() {

	gui = new GUI();

	// Source & Renderer Settings
	const sourceFolder = gui.addFolder( 'Source & Renderer' );
	sourceFolder.add( state, 'sourceType', Object.keys( SOURCE_PRESETS ) )
		.name( 'Data Source' )
		.onChange( ( value ) => {

			initStateFromPreset( value );
			rebuildGUI();
			recreateTiles();

		} );
	sourceFolder.add( state, 'renderMode', [ 'Mesh', 'Texture' ] )
		.name( 'Render Mode' )
		.onChange( recreateTiles );
	sourceFolder.open();

	// Initial layer and color folders
	rebuildGUI();

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
