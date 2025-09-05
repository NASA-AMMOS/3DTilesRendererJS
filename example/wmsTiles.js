import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import {
	TilesRenderer,
	GlobeControls,
	EnvironmentControls,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	UpdateOnChangePlugin,
	WMSCapabilitiesLoader,
	WMSTilesPlugin,
} from '3d-tiles-renderer/plugins';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as THREE from 'three';


const url =
	window.location.hash.replace( /^#/, '' ) ||
	'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer?SERVICE=WMS';


let controls, scene, renderer;
let wmsTiles, camera, gui;
let params, capabilities;

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
	camera = new PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		0.001,
		10000,
	);

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

		baseUrl: url, // Remove GetCapabilities params
		layer: defaultLayer.name,
		style: defaultLayer.styles[ 0 ]?.name || '',
		crs: selectedCRS,
		format: 'image/png',
		tileDimension: 256,
		planar: false,
		bounds: defaultLayer.boundingBoxes[ 0 ]?.bounds || [ - 180, - 90, 180, 90 ],
		version: capabilities.version || '1.3.0',
		styles: defaultLayer.styles[ 0 ]?.name || '',

	};

	rebuildGUI();
	rebuildTiles();

}

function rebuildGUI() {

	if ( gui ) gui.destroy();

	const layer = capabilities.layers.find( ( l ) => l.name === params.layer );

	gui = new GUI();
	//gui.add( params, 'planar' ).onChange( rebuildTiles ); wms doesn't show up in planar mode
	gui
		.add(
			params,
			'layer',
			capabilities.layers.map( ( l ) => l.name ),
		)
		.onChange( () => {

			const selectedLayer = capabilities.layers.find(
				( l ) => l.name === params.layer,
			);
			params.crs = selectedLayer.crs[ 0 ] || 'EPSG:3857';
			params.bounds = selectedLayer.boundingBoxes[ 0 ]?.bounds || [
				- 180, - 90, 180, 90,
			];
			params.styles = selectedLayer.styles[ 0 ]?.name || '';
			rebuildGUI();
			rebuildTiles();

		} );
	gui
		.add(
			params,
			'styles',
			layer.styles.map( ( s ) => s.name ),
		)
		.onChange( rebuildTiles );
	gui.add( params, 'crs', layer.crs ).onChange( rebuildTiles );
	gui.add( params, 'format', [ 'image/png', 'image/jpeg' ] ).onChange( rebuildTiles );
	gui.add( params, 'tileDimension', [ 256, 512 ] ).onChange( rebuildTiles );

}
function rebuildTiles() {

	//if ( xyzTiles ) xyzTiles.dispose();
	if ( wmsTiles ) wmsTiles.dispose();
	if ( controls ) {

		controls.dispose();
		controls = null;

	}

	// XYZ base layer
	// xyzTiles = new TilesRenderer();
	// xyzTiles.registerPlugin( new TilesFadePlugin() );
	// xyzTiles.registerPlugin( new UpdateOnChangePlugin() );
	// xyzTiles.registerPlugin(
	// 	new XYZTilesPlugin( {
	// 		center: true,
	// 		shape: params.planar ? 'planar' : 'ellipsoid',
	// 		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
	// 	} ),
	// );
	// xyzTiles.setCamera( camera );
	// scene.add( xyzTiles.group );

	// WMS overlay layer
	wmsTiles = new TilesRenderer();
	wmsTiles.registerPlugin( new TilesFadePlugin() );
	wmsTiles.registerPlugin( new UpdateOnChangePlugin() );
	wmsTiles.registerPlugin(
		new WMSTilesPlugin( {
			shape: params.planar ? 'planar' : 'ellipsoid',
			center: true,
			baseUrl: url.replace( /\?.*$/, '' ),
			layer: params.layer,
			crs: params.crs,
			format: params.format,
			tileDimension: params.tileDimension,
			styles: params.styles,
			version: params.version,
			bounds: params.bounds,
		} ),
	);
	wmsTiles.setCamera( camera );

	scene.add( wmsTiles.group );

	//xyzTiles.group.renderOrder = 0;
	wmsTiles.group.renderOrder = 1;

	// const marker = addPointerMarker( 8.811, 44.4056 ); // Genoa, Italy

	// Controls setup ( same as before )
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

		//xyzTiles.group.rotation.x = - Math.PI / 2;
		wmsTiles.group.rotation.x = - Math.PI / 2;
		controls = new GlobeControls( scene, camera, renderer.domElement );
		controls.setEllipsoid( wmsTiles.ellipsoid, wmsTiles.group );
		controls.enableDamping = true;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		moveCameraToLonLat( 8.9463, 44.4056 );

		//camera.position.copy( marker.getWorldPosition( new THREE.Vector3( 0 ) ) );
		//controls.camera.quaternion.identity();
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
	// if ( xyzTiles ) {

	// 	xyzTiles.setCamera( camera );
	// 	xyzTiles.setResolutionFromRenderer( camera, renderer );
	// 	xyzTiles.update();

	// }
	if ( wmsTiles ) {

		wmsTiles.setCamera( camera );
		wmsTiles.setResolutionFromRenderer( camera, renderer );
		wmsTiles.update();

	}
	renderer.render( scene, camera );

}

// Converts lon, lat, height to Cartesian coordinates on WGS84 ellipsoid
function lonLatHeightToCartesian( lon, lat, height = 0 ) {

	// Globe radius ( should match your ellipsoid/sphere )
	const radius = 6378137.0 + height; // meters

	// Convert degrees to radians
	const lambda = ( lon * Math.PI ) / 180; // longitude
	const phi = ( lat * Math.PI ) / 180; // latitude

	// Spherical coordinates
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

// Example usage: place a marker at Genoa, Italy ( lon: 8.9463, lat: 44.4056 )
// function addPointerMarker( lon, lat, height = 0 ) {
// 	const { x, y, z } = lonLatHeightToCartesian( lon, lat, height );

// 	// Create a small red sphere as a marker
// 	const geometry = new THREE.SphereGeometry( 5000, 16, 16 ); // radius in meters
// 	const material = new THREE.MeshBasicMaterial( {
// 		transparent: true,
// 		opacitiy: 0.3,
// 		color: 0xff0000,
// 	} );
// 	const marker = new THREE.Mesh( geometry, material );

// 	const group = new THREE.Group();
// 	group.add( marker );
// 	marker.position.set( x, y, z );
// 	group.rotation.x = -Math.PI / 2;

// 	scene.add( group );

// 	return marker;
// }
