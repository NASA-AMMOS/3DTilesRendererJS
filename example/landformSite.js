import {
	DebugTilesRenderer as TilesRenderer,
	LRUCache,
	PriorityQueue,
	EnvironmentControls,
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
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { JPLLandformSiteSceneLoader } from './src/JPLLandformSceneLoader.js';

const URLS = [
	// '../landform/NLFS0498_0711156087M000RAS_N0261004NCAM00607_0A0095J01/NLFS0498_0711156087M000RAS_N0261004NCAM00607_0A0095J01_scene.json',
	
	'../landform/NLF_0477_0709296508M723RAS_N0261004NCAM00701_0A0085J02/NLF_0477_0709296508M723RAS_N0261004NCAM00701_0A0085J02_scene.json',
	'../landform/NLF_0477_0709296508M723RAS_N0261004NCAM00708_0A00LLJ02/NLF_0477_0709296508M723RAS_N0261004NCAM00708_0A00LLJ02_scene.json',
	'../landform/NLF_0477_0709297328M366RAS_N0261004NCAM03477_0A0195J02/NLF_0477_0709297328M366RAS_N0261004NCAM03477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709297503M102RAS_N0261004NCAM03477_0A0195J02/NLF_0477_0709297503M102RAS_N0261004NCAM03477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709297668M065RAS_N0261004NCAM03477_0A0195J02/NLF_0477_0709297668M065RAS_N0261004NCAM03477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709297838M897RAS_N0261004NCAM02477_0A0195J02/NLF_0477_0709297838M897RAS_N0261004NCAM02477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709298005M099RAS_N0261004NCAM02477_0A0195J02/NLF_0477_0709298005M099RAS_N0261004NCAM02477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709298187M680RAS_N0261004NCAM13477_0A0195J02/NLF_0477_0709298187M680RAS_N0261004NCAM13477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709298299M678RAS_N0261004NCAM13477_0A0195J02/NLF_0477_0709298299M678RAS_N0261004NCAM13477_0A0195J02_scene.json',
	'../landform/NLF_0477_0709298393M010RAS_N0261004NCAM13477_0A0195J02/NLF_0477_0709298393M010RAS_N0261004NCAM13477_0A0195J02_scene.json',

	// '../landform/NLF_0482_0709734873M194RAS_N0261004NCAM00347_0A0195J02/NLF_0482_0709734873M194RAS_N0261004NCAM00347_0A0195J02_scene.json',
	// '../landform/NLF_0482_0709735996M816RAS_N0261004NCAM00709_0A0095J02/NLF_0482_0709735996M816RAS_N0261004NCAM00709_0A0095J02_scene.json',

	// '../landform/NLF_0490_0710456117M926RAS_N0261004NCAM00709_0A0095J03/NLF_0490_0710456117M926RAS_N0261004NCAM00709_0A0095J03_scene.json',

	// '../landform/NLF_0491_0710536867M784RAS_N0261004NCAM00709_0A0095J02/NLF_0491_0710536867M784RAS_N0261004NCAM00709_0A0095J02_scene.json',

	// '../landform/NLF_0495_0710900102M755RAS_N0261004NCAM00709_0A0095J02/NLF_0495_0710900102M755RAS_N0261004NCAM00709_0A0095J02_scene.json',
	
	// '../landform/NLF_0499_0711256332M612RAS_N0261004NCAM00347_0A1195J03/NLF_0499_0711256332M612RAS_N0261004NCAM00347_0A1195J03_scene.json',
	
];

console.log( URLS.length )

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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.025, 4000 );
	camera.position.set( 20, 10, 20 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.adjustHeight = false;
	controls.minDistance = 1;
	controls.maxAltitude = Math.PI;

	// controls.screenSpacePanning = false;
	// controls.maxDistance = 2000;
	// controls.maxPolarAngle = Math.PI / 2;
	// controls.baseSpeed = 0.1;
	// controls.fastSpeed = 0.2;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	const tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	let downloadQueue = null;
	let parseQueue = null;
	let lruCache = null;
	URLS.forEach( async url => {

		const scene = await new JPLLandformSiteSceneLoader().load( url );
		const tokens = url.split( /[\\/]/g );
		tokens.pop();

		scene.tilesets.forEach( info => {

			const url = [ ...tokens, `${ info.id }_tileset.json` ].join( '/' );
			const tiles = new TilesRenderer( url );

			console.log( info.id, url )
			lruCache = lruCache || tiles.lruCache;
			parseQueue = parseQueue || tiles.parseQueue;
			downloadQueue = downloadQueue || tiles.downloadQueue;

			tiles.lruCache = lruCache;
			tiles.downloadQueue = downloadQueue;
			tiles.parseQueue = parseQueue;
			tiles.setCamera( camera );

			const frame = scene.frames.find( f => f.id === info.frame_id );
			frame.sceneMatrix.decompose( tiles.group.position, tiles.group.quaternion, tiles.group.scale );
			tilesParent.add( tiles.group );
			tileSets.push( tiles );

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
	controls.update();

	tileSets.forEach( tiles => {

		tiles.errorTarget = params.errorTarget;
		tiles.displayBoxBounds = params.displayBoxBounds;

		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	} );

	renderer.render( scene, camera );

}
