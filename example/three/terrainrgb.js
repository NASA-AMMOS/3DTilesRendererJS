import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer, GlobeControls } from '3d-tiles-renderer';
import { DebugTilesPlugin, TerrainRGBMeshPlugin, TerrariumMeshPlugin, XYZTilesOverlay } from '3d-tiles-renderer/plugins';
import { MeshBVHPlugin } from './src/plugins/MeshBVHPlugin.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const PROVIDERS = {

	// Terrarium tiles from the AWS terrain tiles dataset
	'Terrarium (AWS)': {
		plugin: TerrariumMeshPlugin,
		url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
		maxZoom: 15,
	},

	// Terrain-RGB tiles of the open Mapterhorn dataset hosted by Re:Earth
	'Terrain-RGB (Re:Earth)': {
		plugin: TerrainRGBMeshPlugin,
		url: 'https://terrain.reearth.land/mapterhorn-egm08/mapbox/elevation/{z}/{x}/{y}.png',
		maxZoom: 14,
	},

};

const options = {
	errorTarget: 2,
	provider: 'Terrarium (AWS)',
	displayBoxBounds: false,
	displayRegionBounds: false,
};

let camera, controls, scene, renderer, tiles, debugPlugin;

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

	window.addEventListener( 'resize', onWindowResize, false );
	onWindowResize();

	initTiles();

	// GUI
	const gui = new GUI();
	gui.add( options, 'errorTarget', 1, 40, 1 );
	gui.add( options, 'provider', Object.keys( PROVIDERS ) ).onChange( initTiles );
	gui.add( options, 'displayBoxBounds' );
	gui.add( options, 'displayRegionBounds' );

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
	const provider = PROVIDERS[ options.provider ];
	tiles = new TilesRenderer();
	tiles.registerPlugin( new provider.plugin( {
		url: provider.url,
		maxZoom: provider.maxZoom,
		overlay,
		applyOverlayTexture: true,
	} ) );

	// accelerate raycasting against the dense terrain meshes
	tiles.registerPlugin( new MeshBVHPlugin() );

	// debug bounding volume display
	debugPlugin = new DebugTilesPlugin();
	tiles.registerPlugin( debugPlugin );
	tiles.group.rotation.x = - Math.PI / 2;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );
	controls.enableDamping = true;
	controls.minDistance = 150;
	controls.camera.position.set( 0, 0, 1.75 * 1e7 );
	controls.camera.quaternion.identity();

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
	debugPlugin.displayBoxBounds = options.displayBoxBounds;
	debugPlugin.displayRegionBounds = options.displayRegionBounds;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
