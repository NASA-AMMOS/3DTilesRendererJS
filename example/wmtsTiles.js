import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, WMTSCapabilitiesLoader, WMTSTilesPlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const url = window.location.hash.replace( /^#/, '' ) || 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&request=GetCapabilities';
const compatibleCRSList = [ 'EPSG:4326', 'EPSG:3857' ];

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

	// update the capabilities file
	updateCapabilities();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'hashchange', () => location.reload() );

}

async function updateCapabilities() {

	// load the capabilities file
	capabilities = await new WMTSCapabilitiesLoader().loadAsync( url );

	// use a default overlay
	let defaultLayer = 'MODIS_Terra_CorrectedReflectance_TrueColor';

	if ( ! capabilities.layers.find( l => l.identifier === defaultLayer ) ) {

		defaultLayer = capabilities.layers.find( l =>
			l.tileMatrixSets.some( tms => compatibleCRSList.includes( tms.supportedCRS ) )
		).identifier;

	}

	// set up the parameters
	params = {
		layer: defaultLayer,
		style: null,
		tileMatrixSet: null,
		planar: false,
		dimensions: {},
	};

	rebuildGUI();
	rebuildTiles();

}

function rebuildGUI() {

	if ( gui ) {

		gui.destroy();

	}

	params.style = null;
	params.tileMatrixSet = null;
	params.dimensions = {};

	// initialize the layer settings
	const layer = capabilities.layers.find( l => l.identifier === params.layer );
	params.style = layer.styles.find( s => s.isDefault )?.identifier || layer.styles[ 0 ].identifier;
	const compatibleTileMatrixSet = layer.tileMatrixSets.find( tms => compatibleCRSList.includes( tms.supportedCRS ) );
	params.tileMatrixSet = compatibleTileMatrixSet ? compatibleTileMatrixSet.identifier : layer.tileMatrixSets[ 0 ].identifier;

	// update the ui
	const abstract = capabilities.serviceIdentification.abstract;
	document.getElementById( 'info' ).innerHTML =
		'<b>' + capabilities.serviceIdentification.title + '</b>' + ( abstract ? '<br/>' + abstract : '' ) +
		'<br/>' + layer.title;


	gui = new GUI();
	gui.add( params, 'planar' ).onChange( rebuildTiles );
	gui.add( params, 'layer', capabilities.layers.map( l => l.identifier ) ).onChange( () => {

		rebuildGUI( url );
		rebuildTiles();

	} );
	gui.add( params, 'tileMatrixSet', layer.tileMatrixSets.map( tms => tms.identifier ) ).onChange( rebuildTiles );
	gui.add( params, 'style', layer.styles.map( s => s.identifier ) ).onChange( rebuildTiles );

	// create the UI for dimensions
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

			if ( /^MODIS_Terra/.test( params.layer ) ) {

				// NOTE: this is a good full-ranged time to use with a full set of data typically used by GIBs for demos
				values.push( '2013-06-16' );
				params.dimensions[ dim.identifier ] = '2013-06-16';

			}

		}

		gui.add( params.dimensions, dim.identifier, values ).onChange( rebuildTiles );

	}

}

function rebuildTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	if ( controls ) {

		controls.dispose();
		controls = null;

	}

	// tiles
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new WMTSTilesPlugin( {
		shape: params.planar ? 'planar' : 'ellipsoid',
		center: true,
		capabilities,
		...params,
	} ) );

	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( params.planar ) {

		// create the controls
		controls = new EnvironmentControls( scene, camera, renderer.domElement );
		controls.enableDamping = true;
		controls.minDistance = 1e-4;
		controls.maxDistance = 5;
		controls.cameraRadius = 0;
		controls.fallbackPlane.normal.set( 0, 0, 1 );
		controls.up.set( 0, 0, 1 );
		controls.camera.position.set( 0, 0, 2 );
		controls.camera.quaternion.identity();

		// reset the camera
		camera.near = 1e-4;
		camera.far = 10;
		camera.updateProjectionMatrix();

	} else {

		// init tiles
		tiles.group.rotation.x = - Math.PI / 2;

		// create the controls
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
