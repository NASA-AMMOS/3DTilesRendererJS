import {
	GlobeControls,
	TilesRenderer,
	LUNAR_ELLIPSOID,
} from '3d-tiles-renderer';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
} from 'three';
import { TilesFadePlugin } from './src/plugins/fade/TilesFadePlugin.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TileCompressionPlugin } from './src/plugins/TileCompressionPlugin.js';
import { UpdateOnChangePlugin } from './src/plugins/UpdateOnChangePlugin.js';

let controls, scene, camera, renderer, tiles;

const apiKey = localStorage.getItem( 'ionApiKey' ) ?? 'put-your-api-key-here';
const params = {

	apiKey: apiKey,
	reload: reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	localStorage.setItem( 'ionApiKey', params.apiKey );

	tiles = new TilesRenderer();
	tiles.ellipsoid.copy( LUNAR_ELLIPSOID );
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: params.apiKey, assetId: '2684829', autoRefreshToken: true } ) );
	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.group.rotation.x = - Math.PI / 2;
	tiles.errorTarget = 20;
	scene.add( tiles.group );

	tiles.setCamera( camera );
	controls.setTilesRenderer( tiles );

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( 2620409, 0, - 6249816 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;

	// initialize tiles
	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'apiKey' );
	gui.add( params, 'reload' );

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	controls.update();

	// update options
	tiles.setResolutionFromRenderer( camera, renderer );

	// update tiles
	camera.updateMatrixWorld();
	tiles.update();

	renderer.render( scene, camera );

}
