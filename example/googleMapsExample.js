import {
	WGS84_ELLIPSOID,
	CAMERA_FRAME,
	GeoUtils,
	GlobeControls,
	GooglePhotorealisticTilesRenderer,
	GoogleCloudAuthPlugin,
} from '../src/index.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	MathUtils,
	OrthographicCamera,
	Matrix4,
	Euler,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { CameraTransitionManager } from './src/camera/CameraTransitionManager.js';
import { TileCompressionPlugin } from './src/plugins/TileCompressionPlugin.js';
import { UpdateOnChangePlugin } from './src/plugins/UpdateOnChangePlugin.js';
import { TilesFadePlugin } from './src/plugins/fade/TilesFadePlugin.js';

let controls, scene, renderer, tiles, transition;
let statsContainer, stats;

const apiKey = localStorage.getItem( 'googleApiKey' ) ?? 'put-your-api-key-here';

const params = {

	orthographic: false,

	enableCacheDisplay: false,
	enableRendererStats: false,
	apiKey: apiKey,

	'reload': reinstantiateTiles,

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

	tiles = new GooglePhotorealisticTilesRenderer();
	tiles.registerPlugin( new GoogleCloudAuthPlugin( { apiToken: params.apiKey } ) );
	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.group.rotation.x = - Math.PI / 2;
	tiles.errorTarget = 50;

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );

	tiles.manager.addHandler( /\.gltf$/, loader );
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( transition.camera, renderer );
	tiles.setCamera( transition.camera );

	controls.setTilesRenderer( tiles );

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera and transition set up
	transition = new CameraTransitionManager(
		new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 ),
		new OrthographicCamera( - 1, 1, 1, - 1, 1, 160000000 ),
	);

	transition.perspectiveCamera.position.set( 4800000, 2570000, 14720000 );
	transition.perspectiveCamera.lookAt( 0, 0, 0 );

	transition.addEventListener( 'camera-changed', ( { camera, prevCamera } ) => {

		tiles.deleteCamera( prevCamera );
		tiles.setCamera( camera );
		controls.setCamera( camera );

	} );

	// disable adjusting the orthographic camera position for zoom since globe controls will do this
	transition.orthographicPositionalZoom = false;

	// controls
	controls = new GlobeControls( scene, transition.camera, renderer.domElement, null );
	controls.enableDamping = true;

	// initialize tiles
	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'hashchange', initFromHash );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	gui.add( params, 'orthographic' ).onChange( v => {

		// TODO: this updates the clip planes based on the current position of the camera which is
		// synced by the transition manager. However the position and clip planes that would be applied
		// by the globe controls when using the controls with the camera are different resulting in
		// some clipping artifacts during transition that "pop" once finished.
		controls.getPivotPoint( transition.fixedPoint );
		controls.updateCameraClipPlanes( transition.perspectiveCamera );
		controls.updateCameraClipPlanes( transition.orthographicCamera );

		transition.toggle();

	} );

	const mapsOptions = gui.addFolder( 'Google Tiles' );
	mapsOptions.add( params, 'apiKey' );
	mapsOptions.add( params, 'reload' );

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'enableCacheDisplay' );
	exampleOptions.add( params, 'enableRendererStats' );

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

	const { perspectiveCamera, orthographicCamera } = transition;
	const aspect = window.innerWidth / window.innerHeight;

	perspectiveCamera.aspect = aspect;
	perspectiveCamera.updateProjectionMatrix();

	orthographicCamera.left = - orthographicCamera.top * aspect;
	orthographicCamera.right = - orthographicCamera.left;
	orthographicCamera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function updateHash() {

	if ( ! tiles ) {

		return;

	}

	const camera = transition.camera;
	const cartographicResult = {};
	const orientationResult = {};
	const tilesMatInv = tiles.group.matrixWorld.clone().invert();
	const localCameraPos = camera.position.clone().applyMatrix4( tilesMatInv );
	const localCameraMat = camera.matrixWorld.clone().premultiply( tilesMatInv );

	// get the data
	WGS84_ELLIPSOID.getPositionToCartographic( localCameraPos, cartographicResult );
	WGS84_ELLIPSOID.getAzElRollFromRotationMatrix(
		cartographicResult.lat, cartographicResult.lon, localCameraMat,
		orientationResult, CAMERA_FRAME,
	);

	// convert to DEG
	orientationResult.azimuth *= MathUtils.RAD2DEG;
	orientationResult.elevation *= MathUtils.RAD2DEG;
	cartographicResult.lat *= MathUtils.RAD2DEG;
	cartographicResult.lon *= MathUtils.RAD2DEG;

	// update hash
	const params = new URLSearchParams();
	params.set( 'lat', cartographicResult.lat.toFixed( 4 ) );
	params.set( 'lon', cartographicResult.lon.toFixed( 4 ) );
	params.set( 'height', cartographicResult.height.toFixed( 2 ) );
	params.set( 'az', orientationResult.azimuth.toFixed( 2 ) );
	params.set( 'el', orientationResult.elevation.toFixed( 2 ) );
	window.history.replaceState( undefined, undefined, `#${ params }` );

}

function initFromHash() {

	const hash = window.location.hash.replace( /^#/, '' );
	const params = new URLSearchParams( hash );
	if ( ! params.has( 'lat' ) && ! params.has( 'lon' ) ) {

		return;

	}

	// update the tiles matrix world so we can use it
	tiles.group.updateMatrixWorld();

	// get the position fields
	const camera = transition.camera;
	const lat = parseFloat( params.get( 'lat' ) );
	const lon = parseFloat( params.get( 'lon' ) );
	const height = parseFloat( params.get( 'height' ) ) || 1000;

	if ( params.has( 'az' ) && params.has( 'el' ) ) {

		// get the az el fields for rotation if present
		const az = parseFloat( params.get( 'az' ) );
		const el = parseFloat( params.get( 'el' ) );

		// extract the east-north-up frame into matrix world
		WGS84_ELLIPSOID.getRotationMatrixFromAzElRoll(
			lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD,
			az * MathUtils.DEG2RAD, el * MathUtils.DEG2RAD, 0,
			camera.matrixWorld, CAMERA_FRAME,
		);

		// apply the necessary tiles transform
		camera.matrixWorld.premultiply( tiles.group.matrixWorld );
		camera.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale );

		// get the height
		WGS84_ELLIPSOID.getCartographicToPosition( lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD, height, camera.position );
		camera.position.applyMatrix4( tiles.group.matrixWorld );

	} else {

		// default to looking down if no az el are present
		WGS84_ELLIPSOID.getCartographicToPosition( lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD, height, camera.position );
		camera.position.applyMatrix4( tiles.group.matrixWorld );
		camera.lookAt( 0, 0, 0 );

	}

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	controls.enabled = ! transition.animating;
	controls.update();
	transition.update();

	// update options
	const camera = transition.camera;
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// update tiles
	camera.updateMatrixWorld();
	tiles.update();

	renderer.render( scene, camera );
	stats.update();

	updateHtml();

}

function updateHtml() {

	// render html text updates
	const cacheFullness = tiles.lruCache.itemList.length / tiles.lruCache.maxSize;
	let str = '';

	if ( params.enableCacheDisplay ) {

		str += `Downloading: ${ tiles.stats.downloading } Parsing: ${ tiles.stats.parsing } Visible: ${ tiles.visibleTiles.size }<br/>`;

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
	const vec = transition.camera.position.clone().applyMatrix4( mat );

	const res = {};
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );
	document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + tiles.getCreditsString();

}
