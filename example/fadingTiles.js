import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
} from 'three';
import { FadeTilesRenderer, } from './src/FadeTilesRenderer.js';
import { EnvironmentControls } from '../src/index.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer;
let groundTiles, skyTiles, tilesParent;

const params = {

	reinstantiateTiles,
	fadeRootTiles: true,
	useFade: true,
	errorTarget: 12,
	fadeDuration: 0.5,
	renderScale: 1,
	fadingGroundTiles: '0 tiles',

};

init();
render();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xd8cec0 );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.25, 4000 );
	camera.position.set( 20, 10, 20 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.minZoomDistance = 2;
	controls.cameraRadius = 1;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	const gui = new GUI();
	gui.add( params, 'useFade' );
	gui.add( params, 'fadeRootTiles' );
	gui.add( params, 'errorTarget', 0, 1000 );
	gui.add( params, 'fadeDuration', 0, 5 );
	gui.add( params, 'renderScale', 0.1, 1.0, 0.05 ).onChange( v => renderer.setPixelRatio( v * window.devicePixelRatio ) );

	const textController = gui.add( params, 'fadingGroundTiles' ).listen().disable();
	textController.domElement.style.opacity = 1.0;

	gui.add( params, 'reinstantiateTiles' );

	gui.open();

}

function reinstantiateTiles() {

	if ( groundTiles ) {

		groundTiles.dispose();
		skyTiles.dispose();

	}

	groundTiles = new FadeTilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	groundTiles.fetchOptions.mode = 'cors';
	groundTiles.lruCache.minSize = 900;
	groundTiles.lruCache.maxSize = 1300;
	groundTiles.errorTarget = 12;

	skyTiles = new FadeTilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = groundTiles.lruCache;

	tilesParent.add( groundTiles.group, skyTiles.group );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	controls.update();
	camera.updateMatrixWorld();

	groundTiles.errorTarget = params.errorTarget;
	groundTiles.fadeRootTiles = params.fadeRootTiles;
	groundTiles.setCamera( camera );
	groundTiles.setResolutionFromRenderer( camera, renderer );
	groundTiles.update();

	skyTiles.fadeRootTiles = params.fadeRootTiles;
	skyTiles.setCamera( camera );
	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.update();

	groundTiles.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	skyTiles.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;

	renderer.render( scene, camera );

	params.fadingGroundTiles = groundTiles.fadingTiles + ' tiles';

}
