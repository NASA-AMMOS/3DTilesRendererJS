import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesRenderer, GlobeControls } from '3d-tiles-renderer';
import { DebugTilesPlugin, TerrariumMeshPlugin, XYZTilesOverlay } from '3d-tiles-renderer/plugins';
import { MeshBVHPlugin } from './src/plugins/MeshBVHPlugin.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Free, no-key Terrarium elevation tiles from the AWS terrain tiles dataset. Override with ?url=.
const params = new URLSearchParams( window.location.search );
const TERRAIN_URL = params.get( 'url' ) ?? 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

const options = {
	errorTarget: 2,
	wireframe: false,
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

	// satellite imagery draped over the generated terrain
	const overlay = new XYZTilesOverlay( {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	} );

	// tiles: the plugin generates the elevation surface, so no tileset url is needed
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TerrariumMeshPlugin( {
		url: TERRAIN_URL,
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

	// draw the displaced grid as wireframe so the relief reads without lighting or texture
	tiles.addEventListener( 'load-model', ( { scene: tileScene } ) => {

		tileScene.traverse( c => {

			if ( c.material ) c.material.wireframe = options.wireframe;

		} );

	} );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement );
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );
	controls.enableDamping = true;
	controls.minDistance = 150;
	controls.camera.position.set( 0, 0, 1.75 * 1e7 );
	controls.camera.quaternion.identity();

	// GUI
	const gui = new GUI();
	gui.add( options, 'errorTarget', 1, 40, 1 );
	gui.add( options, 'displayBoxBounds' );
	gui.add( options, 'displayRegionBounds' );
	gui.add( options, 'wireframe' ).onChange( v => {

		tiles.forEachLoadedModel( tileScene => tileScene.traverse( c => {

			if ( c.material ) c.material.wireframe = v;

		} ) );

	} );
	gui.open();

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
