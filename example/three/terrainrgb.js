import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { TerrainRGBMeshPlugin, TerrariumMeshPlugin, XYZTilesOverlay, TilesFadePlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// heights are in meters while the planar world spans normalized units, one unit per the mercator
// circumference of the earth
const PLANAR_HEIGHT_SCALE = 1 / 40075017;

const options = {
	errorTarget: 1,
	provider: 'Terrarium (AWS)',
	heightScale: 1,
	unlit: false,
	planar: false,
};

let camera, controls, scene, renderer, tiles, terrainPlugin;

init();
render();

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 );

	// lights for the displaced terrain material
	const ambientLight = new AmbientLight( 0xffffff, 0.5 );
	scene.add( ambientLight );

	const directionalLight = new DirectionalLight( 0xffffff, 2 );
	directionalLight.position.set( 1, 2, 3 );
	scene.add( directionalLight );

	window.addEventListener( 'resize', onWindowResize, false );
	onWindowResize();

	initTiles();

	// GUI
	const gui = new GUI();
	gui.add( options, 'errorTarget', 1, 40, 1 );
	gui.add( options, 'provider', [ 'Terrarium (AWS)', 'Terrain-RGB (Re:Earth)' ] ).onChange( initTiles );
	gui.add( options, 'heightScale', 0, 10 ).onChange( v => {

		terrainPlugin.heightScale = options.planar ? v * PLANAR_HEIGHT_SCALE : v;

	} );
	gui.add( options, 'unlit' ).onChange( initTiles );
	gui.add( options, 'planar' ).onChange( initTiles );

	gui.open();

}

function initTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	if ( controls ) {

		controls.dispose();

	}

	// satellite imagery draped over the generated terrain
	const overlay = new XYZTilesOverlay( {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	} );

	// tiles: the plugin generates the elevation surface, so no tileset url is needed
	tiles = new TilesRenderer();
	if ( options.provider === 'Terrarium (AWS)' ) {

		// Terrarium tiles from the AWS terrain tiles dataset
		terrainPlugin = new TerrariumMeshPlugin( {
			url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
			maxZoom: 15,
		} );

	} else {

		// Terrain-RGB tiles of the open Mapterhorn dataset hosted by Re:Earth
		terrainPlugin = new TerrainRGBMeshPlugin( {
			url: 'https://terrain.reearth.land/mapterhorn-egm08/mapbox/elevation/{z}/{x}/{y}.png',
			tileDimension: 512,
			maxZoom: 14,
		} );

	}

	terrainPlugin.heightScale = options.planar ? options.heightScale * PLANAR_HEIGHT_SCALE : options.heightScale;
	terrainPlugin.unlit = options.unlit;
	terrainPlugin.shape = options.planar ? 'planar' : 'ellipsoid';
	terrainPlugin.overlay = overlay;
	terrainPlugin.applyOverlayTexture = true;
	tiles.registerPlugin( terrainPlugin );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.setCamera( camera );
	scene.add( tiles.group );

	// controls
	if ( options.planar ) {

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
		controls.minDistance = 150;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		controls.camera.quaternion.identity();

	}

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	if ( ! tiles ) {

		renderer.render( scene, camera );
		return;

	}

	controls.update();
	camera.updateMatrixWorld();

	tiles.errorTarget = options.errorTarget;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
