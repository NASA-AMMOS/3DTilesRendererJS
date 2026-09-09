import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Sphere,
	Raycaster,
	Vector2,
} from 'three';
import { TilesRenderer, EnvironmentControls } from '3d-tiles-renderer';
import { DebugTilesPlugin } from '3d-tiles-renderer/plugins';
import { PotreePlugin } from './src/plugins/PotreePlugin.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Public Potree datasets hosted in the potree repository (CORS-enabled)
const DATASETS = {
	'lion': 'https://raw.githubusercontent.com/potree/potree/refs/heads/develop/pointclouds/lion_takanawa/cloud.js',
	'lion normals': 'https://raw.githubusercontent.com/potree/potree/refs/heads/develop/pointclouds/lion_takanawa_normals/cloud.js',
};

let camera, controls, scene, renderer, tiles;

// With node geometric error set to the potree point spacing, the error target is the point
// spacing projected on screen in pixels. Potree's own defaults refine until the projected
// spacing is ~2-3 pixels, so small values are needed for a comparable density.
const params = {
	enable: true,
	errorTarget: 2,
	maxDepth: 1,
	pointScale: 1,
	pointShape: 'round',
	debugColorMode: 'none',
	displayBoxBounds: false,
	dataset: 'lion',
};

init();
render();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera — near/far span needs to cover the point cloud; will be adjusted once loaded
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( 4, 2, 8 );
	camera.lookAt( 0, 0, 0 );

	// controls raycast the point cloud so rotation pivots around the point under the cursor.
	// The default raycast threshold spans a meter, far too coarse for a small point cloud.
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.enableDamping = true;
	controls.minDistance = 0.25;
	controls.maxDistance = 50;
	controls.cameraRadius = 0;
	controls.useFallbackPlane = false;
	controls.raycaster.params.Points.threshold = 0.05;

	initTiles();

	// on click log the tile the picked point belongs to and expose it as window.TILE
	const downPointer = new Vector2();
	renderer.domElement.addEventListener( 'pointerdown', e => {

		downPointer.set( e.clientX, e.clientY );

	} );
	renderer.domElement.addEventListener( 'pointerup', e => {

		// ignore drags
		if ( Math.abs( e.clientX - downPointer.x ) > 2 || Math.abs( e.clientY - downPointer.y ) > 2 ) {

			return;

		}

		const raycaster = new Raycaster();
		raycaster.params.Points.threshold = 0.1;
		raycaster.setFromCamera( new Vector2(
			( e.clientX / window.innerWidth ) * 2 - 1,
			- ( e.clientY / window.innerHeight ) * 2 + 1,
		), camera );

		// three.js raycasting ignores the "visible" flag so filter hidden points out manually
		const hit = raycaster.intersectObject( tiles.group, true ).find( h => h.object.visible );
		if ( hit ) {

			tiles.forEachLoadedModel( ( scene, tile ) => {

				if ( scene === hit.object ) {

					window.TILE = tile;
					console.log( tile );

				}

			} );

		}

	} );

	// gui
	const gui = new GUI();
	gui.add( params, 'dataset', Object.keys( DATASETS ) ).onChange( initTiles );

	const tilesFolder = gui.addFolder( 'tiles' );
	tilesFolder.add( params, 'enable' );
	tilesFolder.add( params, 'errorTarget', 0.5, 16, 0.1 ).name( 'error target' ).onChange( v => {

		tiles.errorTarget = v;

	} );
	tilesFolder.add( params, 'maxDepth', 1, 20, 1 ).name( 'max depth' ).onChange( v => {

		tiles.maxDepth = v;

	} );

	const pointsFolder = gui.addFolder( 'points' );
	pointsFolder.add( params, 'pointScale', 0.25, 4 ).name( 'point scale' ).onChange( v => {

		tiles.getPluginByName( 'POTREE_PLUGIN' ).pointScale = v;

	} );
	pointsFolder.add( params, 'pointShape', [ 'square', 'round', 'sphere' ] ).name( 'point shape' ).onChange( v => {

		tiles.getPluginByName( 'POTREE_PLUGIN' ).pointShape = v;

	} );

	const debugFolder = gui.addFolder( 'debug' );
	debugFolder.add( params, 'displayBoxBounds' ).name( 'bounding boxes' ).onChange( v => {

		tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' ).displayBoxBounds = v;

	} );
	debugFolder.add( params, 'debugColorMode', [ 'none', 'node', 'depth' ] ).name( 'color mode' ).onChange( v => {

		tiles.getPluginByName( 'POTREE_PLUGIN' ).debugColorMode = v;

	} );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize );

}

function initTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	// tiles
	tiles = new TilesRenderer();
	tiles.registerPlugin( new PotreePlugin( {
		url: DATASETS[ params.dataset ],
		pointScale: params.pointScale,
		pointShape: params.pointShape,
	} ) );
	tiles.registerPlugin( new DebugTilesPlugin( { displayBoxBounds: params.displayBoxBounds } ) );
	tiles.errorTarget = params.errorTarget;
	tiles.maxDepth = params.maxDepth;
	tiles.setCamera( camera );
	tiles.group.rotation.x = - Math.PI / 2;
	scene.add( tiles.group );
	window.TILES = tiles;

	// center the cloud at the origin once the bounds are known
	tiles.addEventListener( 'load-root-tileset', () => {

		const sphere = new Sphere();
		tiles.getBoundingSphere( sphere );
		tiles.group.updateMatrixWorld();
		sphere.applyMatrix4( tiles.group.matrixWorld );
		tiles.group.position.sub( sphere.center );

	} );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	controls.update();

	// pause updates to freeze the tile set and inspect the current state up close
	if ( params.enable ) {

		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	}

	renderer.render( scene, camera );

}
