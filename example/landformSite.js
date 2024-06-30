import {
	TilesRenderer,
	EnvironmentControls,
} from '..';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
} from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { JPLLandformSiteSceneLoader } from './src/JPLLandformSceneLoader.js';

const URLS = [

	'NLF_0477_0709296508M723RAS_N0261004NCAM00701_0A0085J02/NLF_0477_0709296508M723RAS_N0261004NCAM00701_0A0085J02_scene.json',
	'NLF_0477_0709296508M723RAS_N0261004NCAM00708_0A00LLJ02/NLF_0477_0709296508M723RAS_N0261004NCAM00708_0A00LLJ02_scene.json',
	'NLF_0477_0709297328M366RAS_N0261004NCAM03477_0A0195J02/NLF_0477_0709297328M366RAS_N0261004NCAM03477_0A0195J02_scene.json',
	'NLF_0477_0709297503M102RAS_N0261004NCAM03477_0A0195J02/NLF_0477_0709297503M102RAS_N0261004NCAM03477_0A0195J02_scene.json',
	'NLF_0477_0709297668M065RAS_N0261004NCAM03477_0A0195J02/NLF_0477_0709297668M065RAS_N0261004NCAM03477_0A0195J02_scene.json',
	'NLF_0477_0709297838M897RAS_N0261004NCAM02477_0A0195J02/NLF_0477_0709297838M897RAS_N0261004NCAM02477_0A0195J02_scene.json',
	'NLF_0477_0709298005M099RAS_N0261004NCAM02477_0A0195J02/NLF_0477_0709298005M099RAS_N0261004NCAM02477_0A0195J02_scene.json',
	'NLF_0477_0709298187M680RAS_N0261004NCAM13477_0A0195J02/NLF_0477_0709298187M680RAS_N0261004NCAM13477_0A0195J02_scene.json',
	'NLF_0477_0709298299M678RAS_N0261004NCAM13477_0A0195J02/NLF_0477_0709298299M678RAS_N0261004NCAM13477_0A0195J02_scene.json',
	'NLF_0477_0709298393M010RAS_N0261004NCAM13477_0A0195J02/NLF_0477_0709298393M010RAS_N0261004NCAM13477_0A0195J02_scene.json',

	// 'NLFS0498_0711156087M000RAS_N0261004NCAM00607_0A0095J01/NLFS0498_0711156087M000RAS_N0261004NCAM00607_0A0095J01_scene.json',

	// 'NLF_0482_0709734873M194RAS_N0261004NCAM00347_0A0195J02/NLF_0482_0709734873M194RAS_N0261004NCAM00347_0A0195J02_scene.json',
	// 'NLF_0482_0709735996M816RAS_N0261004NCAM00709_0A0095J02/NLF_0482_0709735996M816RAS_N0261004NCAM00709_0A0095J02_scene.json',

	// 'NLF_0490_0710456117M926RAS_N0261004NCAM00709_0A0095J03/NLF_0490_0710456117M926RAS_N0261004NCAM00709_0A0095J03_scene.json',

	// 'NLF_0491_0710536867M784RAS_N0261004NCAM00709_0A0095J02/NLF_0491_0710536867M784RAS_N0261004NCAM00709_0A0095J02_scene.json',

	// 'NLF_0495_0710900102M755RAS_N0261004NCAM00709_0A0095J02/NLF_0495_0710900102M755RAS_N0261004NCAM00709_0A0095J02_scene.json',

	// 'NLF_0499_0711256332M612RAS_N0261004NCAM00347_0A1195J03/NLF_0499_0711256332M612RAS_N0261004NCAM00347_0A1195J03_scene.json',

].map( n => {

	return 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/m20-drive-1004/tilesets/' + n;

} );

const tileSets = [];
let camera, controls, scene, renderer;

const params = {

	errorTarget: 12,

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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.025, 4000 );
	camera.position.set( 20, 10, 20 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.adjustHeight = false;
	controls.minDistance = 1;
	controls.maxAltitude = Math.PI;

	// tile group
	const tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	// load all tile sets
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

	controls.update();
	camera.updateMatrixWorld();

	tileSets.forEach( tiles => {

		tiles.errorTarget = params.errorTarget;

		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	} );

	renderer.render( scene, camera );

}
