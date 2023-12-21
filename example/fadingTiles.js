import {
	FadeTilesRenderer,
} from './src/FadeTilesRenderer.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
} from 'three';
import { FlyOrbitControls } from './FlyOrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer;
let groundTiles, skyTiles;

const params = {

	fog: false,
	errorTarget: 12,
	fadeDuration: 0.25,
	renderScale: 1,
	displayActiveTiles: true,
	fadingTiles: '0 tiles',

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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 20, 10, 20 );

	// controls
	controls = new FlyOrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;
	controls.maxPolarAngle = Math.PI / 2;
	controls.baseSpeed = 0.1;
	controls.fastSpeed = 0.2;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	const tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	groundTiles = new FadeTilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	groundTiles.fetchOptions.mode = 'cors';
	groundTiles.lruCache.minSize = 900;
	groundTiles.lruCache.maxSize = 1300;
	groundTiles.errorTarget = 12;
	groundTiles.displayActiveTiles = true;

	skyTiles = new FadeTilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = groundTiles.lruCache;
	skyTiles.displayActiveTiles = true;

	tilesParent.add( groundTiles.group, skyTiles.group );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	const gui = new GUI();
	gui.add( params, 'displayActiveTiles' );
	gui.add( params, 'errorTarget', 0, 100 );
	gui.add( params, 'fadeDuration', 0, 5 );
	gui.add( params, 'renderScale', 0.1, 1.0, 0.05 ).onChange( v => renderer.setPixelRatio( v * window.devicePixelRatio ) );
	gui.add( params, 'fadingTiles' ).listen().disable();
	gui.open();

	gui.children[ 4 ].domElement.style.opacity = 1.0;

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	camera.updateMatrixWorld();

	groundTiles.errorTarget = params.errorTarget;

	groundTiles.setCamera( camera );
	groundTiles.setResolutionFromRenderer( camera, renderer );
	groundTiles.displayActiveTiles = params.displayActiveTiles;
	groundTiles.update();

	skyTiles.setCamera( camera );
	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.displayActiveTiles = params.displayActiveTiles;
	skyTiles.update();

	groundTiles.fadeDuration = params.fadeDuration * 1000;
	skyTiles.fadeDuration = params.fadeDuration * 1000;

	renderer.render( scene, camera );

	params.fadingTiles = groundTiles._fadeGroup.children.length + ' tiles';

}
