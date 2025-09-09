import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import {
	TilesRenderer,
	GlobeControls,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	UpdateOnChangePlugin,
	WMSCapabilitiesLoader,
	WMSTilesPlugin,
} from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const url =
	window.location.hash.replace( /^#/, '' ) ||
	'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer?SERVICE=WMS';

let controls, scene, renderer;
let tiles, camera, gui;
let params, capabilities;

init();

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	renderer.setAnimationLoop( render );

	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight );

	updateCapabilities();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'hashchange', () => location.reload() );

}

async function updateCapabilities() {

	capabilities = await new WMSCapabilitiesLoader().loadAsync( url + '&request=GetCapabilities' );
	const defaultLayer = capabilities.layers[ 0 ];

	let selectedCRS = 'EPSG:4326';
	if ( defaultLayer.crs.includes( 'EPSG:3857' ) ) {

		selectedCRS = 'EPSG:3857';

	}

	params = {
		url: url, // Remove GetCapabilities params
		layer: defaultLayer.name,
		style: defaultLayer.styles[ 0 ]?.name || '',
		crs: selectedCRS,
		format: 'image/png',
		tileDimension: 256,
		planar: false,
		version: capabilities.version || '1.3.0',
		styles: defaultLayer.styles[ 0 ]?.name || '',
	};

	rebuildGUI();
	rebuildTiles();

}

function rebuildGUI() {

	if ( gui ) gui.destroy();

	const layer = capabilities.layerMap[ params.layer ];

	gui = new GUI();
	gui.add( params, 'planar' ).onChange( rebuildTiles );// wms doesn't show up in planar mode
	gui.add( params, 'layer', capabilities.layers.map( l => l.name ) )
		.onChange( () => {

			const selectedLayer = capabilities.layerMap[ params.layer ];
			params.crs = selectedLayer.crs[ 0 ];
			params.styles = selectedLayer.styles[ 0 ]?.name || '';
			rebuildGUI();
			rebuildTiles();

		} );
	gui.add( params, 'styles', layer.styles.map( s => s.name ) ).onChange( rebuildTiles );
	gui.add( params, 'crs', layer.crs ).onChange( rebuildTiles );
	gui.add( params, 'format', capabilities.request.GetMap.formats ).onChange( rebuildTiles );
	gui.add( params, 'tileDimension', [ 256, 512 ] ).onChange( rebuildTiles );

}

function rebuildTiles() {

	if ( tiles ) {

		tiles.dispose();
		tiles = null;

	}

	if ( controls ) {

		controls.dispose();
		controls = null;

	}

	// WMS overlay layer
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin(
		new WMSTilesPlugin( {
			shape: params.planar ? 'planar' : 'ellipsoid',
			center: true,
			url: capabilities.request.GetMap.href,
			layer: params.layer,
			crs: params.crs,
			format: params.format,
			tileDimension: params.tileDimension,
			styles: params.styles,
			version: params.version,
		} ),
	);

	tiles.group.rotation.x = - Math.PI / 2;
	scene.add( tiles.group );

	// init controls
	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );
	controls.enableDamping = true;
	controls.camera.position.set( 0, 0, 1.75 * 1e7 );
	controls.camera.quaternion.identity();
	controls.minDistance = 150;

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
