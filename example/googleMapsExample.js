import {
	WGS84_ELLIPSOID,
	GeoUtils,
	GlobeControls,
	DebugGoogleTilesRenderer as GoogleTilesRenderer,
} from '../src/index.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	MathUtils,
	CameraHelper,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { FlyOrbitControls } from './src/controls/FlyOrbitControls.js';

let camera, controls, scene, renderer, tiles, cameraHelper;
let thirdPersonCamera, thirdPersonRenderer, thirdPersonControls;
let statsContainer, stats;

const apiKey = localStorage.getItem( 'googleApiKey' ) ?? 'put-your-api-key-here';

const params = {

	enableCacheDisplay: false,
	enableRendererStats: false,
	apiKey: apiKey,

	'reload': reinstantiateTiles,
	displayBoxBounds: false,
	displayRegionBounds: false,

	showThirdPerson: false,

};

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	localStorage.setItem( 'googleApiKey', params.apiKey );

	tiles = new GoogleTilesRenderer( params.apiKey );
	tiles.group.rotation.x = - Math.PI / 2;

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );

	tiles.manager.addHandler( /\.gltf$/, loader );
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	controls.setTilesRenderer( tiles );

	tiles.loadedModels = 0;
	tiles.onLoadModel = () => {

		tiles.loadedModels ++;

	};

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( 4800000, 2570000, 14720000 );
	camera.lookAt( 0, 0, 0 );

	// Third person camera view
	thirdPersonCamera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	thirdPersonCamera.position.set( 4800000, 2570000, 14720000 );
	thirdPersonCamera.lookAt( 0, 0, 0 );

	thirdPersonRenderer = new WebGLRenderer( { antialias: true } );
	thirdPersonRenderer.setPixelRatio( window.devicePixelRatio );
	thirdPersonRenderer.setSize( window.innerWidth, window.innerHeight );
	thirdPersonRenderer.setClearColor( 0x0f1416 );

	document.body.appendChild( thirdPersonRenderer.domElement );
	thirdPersonRenderer.domElement.style.position = 'fixed';
	thirdPersonRenderer.domElement.style.left = '5px';
	thirdPersonRenderer.domElement.style.bottom = '5px';
	thirdPersonRenderer.domElement.tabIndex = 1;

	thirdPersonControls = new FlyOrbitControls( thirdPersonCamera, thirdPersonRenderer.domElement );
	thirdPersonControls.screenSpacePanning = false;
	thirdPersonControls.minDistance = 1;
	thirdPersonControls.maxDistance = 14720000000;

	cameraHelper = new CameraHelper( camera );
	cameraHelper.raycast = function () {};
	scene.add( cameraHelper );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const mapsOptions = gui.addFolder( 'Google Tiles' );
	mapsOptions.add( params, 'apiKey' );
	mapsOptions.add( params, 'reload' );

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'displayRegionBounds' );

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'enableCacheDisplay' );
	exampleOptions.add( params, 'enableRendererStats' );
	exampleOptions.add( params, 'showThirdPerson' );

	statsContainer = document.createElement( 'div' );
	document.getElementById( 'info' ).appendChild( statsContainer );

	// Stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

	// run hash functions
	initFromHash();
	setInterval( updateHash, 100 );

}

function onWindowResize() {

	thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
	thirdPersonCamera.updateProjectionMatrix();
	thirdPersonRenderer.setSize( Math.floor( window.innerWidth / 3 ), Math.floor( window.innerHeight / 3 ) );

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );

}

function updateHash() {

	if ( ! tiles ) {

		return;

	}

	const res = {};
	const mat = tiles.group.matrixWorld.clone().invert();
	const vec = camera.position.clone().applyMatrix4( mat );
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );

	res.lat *= MathUtils.RAD2DEG;
	res.lon *= MathUtils.RAD2DEG;

	//todo above camer position use a matrix to get the position, should getPositionElevation be adjusted to work the same ?
	const elevation = WGS84_ELLIPSOID.getPositionElevation( camera.position );

	window.history.replaceState( undefined, undefined, `#${ res.lat.toFixed( 4 ) },${ res.lon.toFixed( 4 ) },${ elevation.toFixed( 4 ) }` );

}

function initFromHash() {

	const hash = window.location.hash.replace( /^#/, '' );
	const tokens = hash.split( /,/g ).map( t => parseFloat( t ) );
	if ( tokens.length < 3 || tokens.findIndex( t => Number.isNaN( t ) ) !== - 1 ) {

		return;

	}

	const [ lat, lon, height ] = tokens;
	WGS84_ELLIPSOID.getCartographicToPosition( lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD, height, camera.position );

	tiles.group.updateMatrixWorld();
	camera.position.applyMatrix4( tiles.group.matrixWorld );
	camera.lookAt( 0, 0, 0 );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	cameraHelper.visible = false;

	controls.update();

	// update options
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );
	tiles.displayBoxBounds = params.displayBoxBounds;
	tiles.displayRegionBounds = params.displayRegionBounds;

	// update tiles
	camera.updateMatrixWorld();
	tiles.update();

	renderer.render( scene, camera );
	stats.update();

	// render third person view
	thirdPersonRenderer.domElement.style.visibility = params.showThirdPerson ? 'visible' : 'hidden';
	if ( params.showThirdPerson ) {

		cameraHelper.update();
		cameraHelper.visible = true;

		thirdPersonRenderer.render( scene, thirdPersonCamera );

	}

	updateHtml();

}

function updateHtml() {

	// render html text updates
	const cacheFullness = tiles.lruCache.itemList.length / tiles.lruCache.maxSize;
	let str = '';

	if ( params.enableCacheDisplay ) {

		str += `Downloading: ${ tiles.stats.downloading } Parsing: ${ tiles.stats.parsing } Visible: ${ tiles.visibleTiles.size }<br/>
		Active: ${ tiles.activeTiles.size }  loadedModels: ${ tiles.loadedModels }<br/>`;

		const geomSet = new Set();
		tiles.traverse( tile => {

			const scene = tile.cached.scene;
			if ( scene ) {

				scene.traverse( c => {

					if ( c.geometry ) {

						geomSet.add( c.geometry );

					}

				} );

			}

		} );

		let count = 0;
		geomSet.forEach( g => {

			count += estimateBytesUsed( g );

		} );
		str += `Cache: ${ ( 100 * cacheFullness ).toFixed( 2 ) }% ~${ ( count / 1000 / 1000 ).toFixed( 2 ) }mb<br/>`;

	}

	if ( params.enableRendererStats ) {

		const memory = renderer.info.memory;
		const programCount = renderer.info.programs.length;
		str += `Geometries: ${ memory.geometries } Textures: ${ memory.textures } Programs: ${ programCount }`;

	}

	if ( statsContainer.innerHTML !== str ) {

		statsContainer.innerHTML = str;

	}

	const mat = tiles.group.matrixWorld.clone().invert();
	const vec = camera.position.clone().applyMatrix4( mat );

	const res = {};
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );
	document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + tiles.getCreditsString();

}
