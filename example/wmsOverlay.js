import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import {
	TilesRenderer,
	GlobeControls,
	EnvironmentControls,
} from '3d-tiles-renderer';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {
	//CesiumIonAuthPlugin,
	//GLTFExtensionsPlugin,
	ImageOverlayPlugin,
	WMSTilesOverlay,
	//WMTSCapabilitiesLoader,
	WMSCapabilitiesLoader,
	TilesFadePlugin,
} from '3d-tiles-renderer/plugins';
import { XYZTilesPlugin } from '3d-tiles-renderer/plugins';
import * as THREE from 'three';

//import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// const dracoLoader = new DRACOLoader().setDecoderPath(
// 	'https://www.gstatic.com/draco/v1/decoders/',
//  );

let capabilities, controls, scene, renderer, tiles, camera, gui;
let wmsOverlay, overlayPlugin;
let params;

( async () => {

	await init();
	render();

} )();

async function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	renderer.setAnimationLoop( render );

	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		0.001,
		10000,
	);

	params = {
		planar: false,
		wmsOpacity: 0.7,
	};

	console.log( 'initializing' );
	await updateCapabilities(); // Wait for capabilities to load

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

}

function rebuildGUI() {

	if ( gui ) gui.destroy();

	const layer = capabilities.layers.find( ( l ) => l.name === params.layer );

	gui = new GUI();
	//gui.add( params, 'planar' ).onChange( rebuildTiles ); // Disabled: WMS does not work in planar mode
	// NOTE: Planar mode is disabled because WMS overlays do not render correctly in planar mode.

	gui.add( params, 'wmsOpacity', 0, 1, 0.01 ).onChange( updateOverlayParams );
	gui
		.add(
			params,
			'layer',
			capabilities.layers.map( ( l ) => l.name ),
		)
		.onChange( updateOverlayParams );
	gui
		.add(
			params,
			'styles',
			layer.styles.map( ( s ) => s.name ),
		)
		.onChange( updateOverlayParams );
	gui.add( params, 'crs', layer.crs ).onChange( updateOverlayParams );
	gui
		.add( params, 'format', [ 'image/png', 'image/jpeg' ] )
		.onChange( updateOverlayParams );
	gui.add( params, 'tileDimension', [ 256, 512 ] ).onChange( updateOverlayParams );
	gui.add( params, 'version', [ '1.1.1', '1.3.0' ] ).onChange( updateOverlayParams );

}

function rebuildTiles() {

	if ( tiles ) tiles.dispose();
	if ( controls ) {

		controls.dispose();
		controls = null;

	}

	tiles = new TilesRenderer();
	tiles.setCamera( camera );
	scene.add( tiles.group );

	tiles.registerPlugin( new TilesFadePlugin() );

	// Base map plugin ( XYZ )
	tiles.registerPlugin(
		new XYZTilesPlugin( {

			bounds: [ - 180, - 90, 180, 90 ],
			levels: 18,
			center: true,
			shape: 'ellipsoid', // seems that planar is no working with wms
			url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		} ),
	);

	// tiles.registerPlugin(
	// 	new GLTFExtensionsPlugin( {
	// 		dracoLoader: dracoLoader,
	// 	} ),
	//  );

	// google tiles for testing with wms
	// tiles.registerPlugin(
	// 	new CesiumIonAuthPlugin( {
	// 		apiToken: `YOUR_CESIUM_TOKEN_HERE`,
	// 		assetId: '2275207',
	// 		autoRefreshToken: true,
	// 	} ),
	//  );

	// Example: Add Authorization header for WMS ( Basic Auth )
	// const username = 'your_username';
	// const password = 'your_password';
	// const basicAuth = 'Basic ' + btoa( `${username}:${password}` );

	const overlayBounds = [ - 180, - 90, 180, 90 ];

	const crsParam = params.version === '1.1.1' ? 'SRS' : 'CRS';

	wmsOverlay = new WMSTilesOverlay( {

		baseUrl: 'https://geoservizi.regione.liguria.it/geoserver/M2660/wms',
		layer: params.layer,
		crs: params.crs,
		crsParam,
		format: params.format,
		tileDimension: params.tileDimension,
		//styles: params.styles,
		version: params.version,
		bounds: overlayBounds,
		levels: 18,
		opacity: params.wmsOpacity,
		// extraHeaders: {
		// 	//'Authorization': 'Bearer your_token_here'
		// 	Authorization: 'Basic ' + btoa( 'your_username:your_password' ),
		// },

	} );

	overlayPlugin = new ImageOverlayPlugin( {

		overlays: [ wmsOverlay ],
		renderer,
		resolution: 256,

	} );

	tiles.registerPlugin( overlayPlugin );

	// Controls setup
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
		moveCameraToLonLat( 8.9463, 44.4056 );
		controls.minDistance = 150;

	}

}

function lonLatHeightToCartesian( lon, lat, height = 0 ) {

	const radius = 6378137.0 + height;
	const lambda = ( lon * Math.PI ) / 180;
	const phi = ( lat * Math.PI ) / 180;
	const x = radius * Math.cos( phi ) * Math.cos( lambda );
	const y = radius * Math.cos( phi ) * Math.sin( lambda );
	const z = radius * Math.sin( phi );
	return { x, y, z };

}

function moveCameraToLonLat( lon, lat, height = 0, cameraDistance = 1e7 ) {

	// 1. Get the marker position
	const { x, y, z } = lonLatHeightToCartesian( lon, lat, height );

	// 2. Apply the same rotation as the globe group
	const rotationMatrix = new THREE.Matrix4().makeRotationX( - Math.PI / 2 );
	const rotatedPos = new THREE.Vector3( x, y, z ).applyMatrix4( rotationMatrix );

	// 3. Place camera along the same direction, at a distance
	const direction = rotatedPos.clone().normalize();
	camera.position.copy( direction.multiplyScalar( cameraDistance ) );

	// 4. Focus camera on the rotated marker position
	camera.lookAt( rotatedPos );

}

async function updateCapabilities() {

	const url =
	    'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetCapabilities';
		//'https://geoservizi.regione.liguria.it/geoserver/M2660/wms?REQUEST=GetCapabilities';

	const loader = new WMSCapabilitiesLoader();

	capabilities = await loader.load( url );

	console.log( 'capabilities:', capabilities );

	const defaultLayer = capabilities.layers[ 0 ];
	let selectedCRS = 'EPSG:4326';
	if ( defaultLayer.crs.includes( 'EPSG:3857' ) ) {

		selectedCRS = 'EPSG:3857';

	}

	params = {

		planar: false, // Disabled: WMS does not work in planar mode
		wmsOpacity: 0.7,
		optimizeWMS: false,
		layer: defaultLayer.name,
		style: defaultLayer.styles[ 0 ]?.name || '',
		crs: selectedCRS,
		format: 'image/png',
		tileDimension: 256,
		bounds: defaultLayer.boundingBoxes[ 0 ]?.bounds || [ - 180, - 90, 180, 90 ],
		version: capabilities.version || '1.3.0',
		styles: defaultLayer.styles[ 0 ]?.name || '',

	};

	rebuildGUI();
	rebuildTiles();

}

function updateOverlayParams() {

	// Remove old overlay and plugin
	if ( overlayPlugin ) {

		tiles.unregisterPlugin( overlayPlugin );
		overlayPlugin = null;

	}
	if ( wmsOverlay ) {

		wmsOverlay.dispose?.();
		wmsOverlay = null;

	}

	// Recreate overlay with updated params
	const overlayBounds = [ - 180, - 90, 180, 90 ];
	const crsParam = params.version === '1.1.1' ? 'SRS' : 'CRS';

	wmsOverlay = new WMSTilesOverlay( {
		baseUrl: 'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer?SERVICE=WMS', // 'https://geoservizi.regione.liguria.it/geoserver/M2660/wms',
		layer: params.layer,
		crs: params.crs,
		crsParam,
		format: params.format,
		tileDimension: params.tileDimension,
		version: params.version,
		bounds: overlayBounds,
		levels: 10,
		opacity: params.wmsOpacity,
		// styles: params.styles,
		// extraHeaders: { ... }
	} );

	overlayPlugin = new ImageOverlayPlugin( {

		overlays: [ wmsOverlay ],
		renderer,
		resolution: 256,

	} );
	tiles.registerPlugin( overlayPlugin );

	tiles.update();

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
