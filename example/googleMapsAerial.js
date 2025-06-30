import { GeoUtils, WGS84_ELLIPSOID, TilesRenderer } from '3d-tiles-renderer';
import { TilesFadePlugin, TileCompressionPlugin, GLTFExtensionsPlugin, CesiumIonAuthPlugin, ReorientationPlugin } from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	MathUtils,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let camera, controls, scene, renderer, tiles;

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		// Note the DRACO compression files need to be supplied via an explicit source.
		// We use unpkg here but in practice should be provided by the application.
		dracoLoader: new DRACOLoader().setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' )
	} ) );
	tiles.registerPlugin( new ReorientationPlugin( { lat: 35.6586 * MathUtils.DEG2RAD, lon: 139.7454 * MathUtils.DEG2RAD } ) );

	// 35.3606, 138.7274 // Mt Fuji
	// 48.8584, 2.2945 // Eiffel Tower
	// 41.8902, 12.4922 // Colosseum
	// 43.8803, - 103.4538 // Mt Rushmore
	// 36.2679, - 112.3535 // Grand Canyon
	// - 22.951890, - 43.210439 // Christ the Redeemer
	// 34.9947, 135.7847 // Kiyomizu-dera
	// 35.6586, 139.7454 // Tokyo Tower

	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 100, 1600000 );
	camera.position.set( 1e3, 1e3, 1e3 ).multiplyScalar( 0.5 );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 500;
	controls.maxDistance = 1e4 * 2;
	controls.minPolarAngle = 0;
	controls.maxPolarAngle = 3 * Math.PI / 8;
	controls.enableDamping = true;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;
	controls.enablePan = false;

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'hashchange', initFromHash );

	// run hash functions
	initFromHash();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );

}

function initFromHash() {

	const hash = window.location.hash.replace( /^#/, '' );
	const tokens = hash.split( /,/g ).map( t => parseFloat( t ) );
	if ( tokens.length !== 2 || tokens.findIndex( t => Number.isNaN( t ) ) !== - 1 ) {

		return;

	}


	const [ lat, lon ] = tokens;
	tiles.setLatLonToYUp( lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	controls.update();

	// update options
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// update tiles
	camera.updateMatrixWorld();
	tiles.update();

	render();

}

function render() {

	// render primary view
	renderer.render( scene, camera );

	if ( tiles ) {

		const mat = tiles.group.matrixWorld.clone().invert();
		const vec = camera.position.clone().applyMatrix4( mat );

		const res = {};
		WGS84_ELLIPSOID.getPositionToCartographic( vec, res );

		const attributions = tiles.getAttributions()[ 0 ]?.value || '';
		document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + attributions;

	}

}
