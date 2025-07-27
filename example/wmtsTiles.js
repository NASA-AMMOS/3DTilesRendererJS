import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer, GlobeControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, WMTSCapabilitiesLoader, WMTSTilesPlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let controls, scene, renderer;
let tiles, camera, gui;
let params, capabilities;

init();
render();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	renderer.setAnimationLoop( render );

	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// set up cameras and ortho / perspective transition
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 );

	// create the controls
	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.enableDamping = true;
	controls.camera.position.set( 0, 0, 1.75 * 1e7 );
	controls.camera.quaternion.identity();
	controls.minDistance = 150;

	updateCapabilities();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'hashchange', updateCapabilities );

}

async function updateCapabilities() {

	// load the capabilities file
	const url = window.location.hash.replace( /^#/, '' ) || 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&request=GetCapabilities';
	capabilities = await new WMTSCapabilitiesLoader().loadAsync( url );

	// update the ui
	document.getElementById( 'info' ).innerHTML = 'WMTS Demonstration, ' + capabilities.serviceIdentification.title + '<br/>' + capabilities.serviceIdentification.abstract;

	rebuildGUI();
	rebuildTiles();

}

function rebuildGUI() {

	if ( gui ) {

		gui.destroy();

	}

	// use a default overlay
	let defaultLayer = 'MODIS_Terra_CorrectedReflectance_TrueColor';
	if ( ! capabilities.layers.find( l => l.identifier === defaultLayer ) ) {

		defaultLayer = capabilities.layers[ 0 ].identifier;

	}

	params = {
		layer: defaultLayer,
		style: null,
		tileMatrixSet: null,
		dimensions: {},
	};


	const layer = capabilities.layers.find( l => l.identifier === params.layer );
	params.style = layer.styles.find( s => s.isDefault ).identifier;
	params.tileMatrixSet = layer.tileMatrixSets[ 0 ].identifier;


	gui = new GUI();
	gui.add( params, 'layer', capabilities.layers.map( l => l.identifier ) ).onChange( () => {

		rebuildGUI();
		rebuildTiles();

	} );
	gui.add( params, 'tileMatrixSet', layer.tileMatrixSets.map( tms => tms.identifier ) ).onChange( rebuildTiles );
	gui.add( params, 'style', layer.styles.map( s => s.identifier ) ).onChange( rebuildTiles );

	for ( const key in layer.dimensions ) {

		const dim = layer.dimensions[ key ];
		params.dimensions[ dim.identifier ] = layer.dimensions[ key ].defaultValue;

		// Note that NASA GIBS uses a custom notation for time
		// https://www.earthdata.nasa.gov/news/blog/wmts-time-dimensions-restful-access
		let values = dim.values;
		if ( dim.identifier === 'Time' && /gibs.earthdata/.test( url ) ) {

			values = values.flatMap( v => {

				const tokens = v.split( /\//g );
				tokens.pop();
				return tokens;

			} );

		}

		gui.add( params.dimensions, dim.identifier, values ).onChange( rebuildTiles );

	}

}

function rebuildTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	// tiles
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new WMTSTilesPlugin( {
		shape: 'ellipsoid',
		capabilities,
		...params,
	} ) );

	tiles.setCamera( camera );
	scene.add( tiles.group );

	// init tiles
	tiles.group.rotation.x = - Math.PI / 2;

	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	controls.update();
	camera.updateMatrixWorld();

	if ( tiles ) {

		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	}

	renderer.render( scene, camera );

}
