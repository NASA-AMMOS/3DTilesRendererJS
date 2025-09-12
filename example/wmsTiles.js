import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { TilesRenderer, GlobeControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, WMSCapabilitiesLoader, WMSTilesPlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

const url =
	window.location.hash.replace( /^#/, '' ) ||
	'https://basemap.nationalmap.gov/arcgis/services/USGSHydroCached/MapServer/WMSServer?SERVICE=WMS';

if ( ! window.location.hash ) {

	document.getElementById( 'info' ).innerHTML = 'Hydrography data set courtesy of the <a href="https://basemap.nationalmap.gov/arcgis/rest/services">USGS National Map Service</a>.';

}

let controls, scene, renderer;
let tiles, camera, gui;
let params, capabilities;

init();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	renderer.setAnimationLoop( render );
	document.body.appendChild( renderer.domElement );

	// set up
	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight );

	// load the tiles
	updateCapabilities();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'hashchange', () => location.reload() );

}

async function updateCapabilities() {

	capabilities = await new WMSCapabilitiesLoader().loadAsync( url + '&request=GetCapabilities' );

	const defaultLayer = capabilities.layers[ 0 ];
	params = {
		layer: defaultLayer.name,
		styles: defaultLayer.styles[ 0 ]?.name || '',
		crs: 'EPSG:4326',
		format: 'image/png',
		tileDimension: 256,
	};

	rebuildGUI();
	rebuildTiles();

}

function rebuildGUI() {

	if ( gui ) {

		gui.destroy();

	}

	const layer = capabilities.layers.find( l => l.name === params.layer );

	gui = new GUI();
	gui.add( params, 'layer', capabilities.layers.map( l => l.name ) )
		.onChange( v => {

			const selectedLayer = capabilities.layers.find( l => l.name === v );
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

	const layer = capabilities.layers.find( l => l.name === params.layer );

	// WMS overlay layer
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin(
		new WMSTilesPlugin( {
			shape: 'ellipsoid',
			url: capabilities.request.GetMap.href,
			layer: params.layer,
			contentBoundingBox: layer.contentBoundingBox,
			crs: params.crs,
			format: params.format,
			tileDimension: params.tileDimension,
			styles: params.styles,
			version: capabilities.version,
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
