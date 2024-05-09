import {
	DebugTilesRenderer as TilesRenderer,
	LRUCache,
	PriorityQueue,
} from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
	FogExp2,
} from 'three';
import { FlyOrbitControls } from './src/controls/FlyOrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { JPLLandformSiteSceneLoader } from './src/JPLLandformSceneLoader.js';

const URLS = [

];

const tileSets = [];
let camera, controls, scene, renderer;

const params = {

	errorTarget: 12,
	displayBoxBounds: false,
	fog: false,

};

init();
render();

function init() {

	const fog = new FogExp2( 0xd8cec0, .0075, 250 );
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

	const downloadQueue = new PriorityQueue();
	const parseQueue = new PriorityQueue();
	const lruCache = new LRUCache();
	URLS.forEach( async url => {

		const scene = await new JPLLandformSiteSceneLoader().load( url );
		const tokens = url.split( /[\\/]/g );
		tokens.pop();

		scene.tilesets.forEach( info => {

			const url = [ ...tokens, `${ info.id }_scene.json` ].join( '/' );
			const tiles = new TilesRenderer( url );
			tiles.lruCache = lruCache;
			tiles.downloadQueue = downloadQueue;
			tiles.parseQueue = parseQueue;
			tiles.setCamera( camera );

			const frame = scene.frames.find( f => f.id === info.frame_id );
			frame.sceneMatrix.decompose( tiles.group.position, tiles.group.quaternion, tiles.group.scale );
			tilesParent.add( tiles.group );

		} );

	} );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	const gui = new GUI();
	gui.add( params, 'fog' ).onChange( v => {

		scene.fog = v ? fog : null;

	} );

	gui.add( params, 'displayBoxBounds' );
	gui.add( params, 'errorTarget', 0, 100 );
	gui.open();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function render() {

	requestAnimationFrame( render );

	camera.updateMatrixWorld();

	tileSets.forEach( tiles => {

		tiles.errorTarget = params.errorTarget;
		tiles.displayBoxBounds = params.displayBoxBounds;

		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	} );

	renderer.render( scene, camera );

}
