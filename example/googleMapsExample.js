import { GeoUtils, WGS84_ELLIPSOID, WGS84_RADIUS, DebugGoogleTilesRenderer as GoogleTilesRenderer } from '../src/index.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	Box3,
	MathUtils,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { MapControls } from './src/lib/MapControls.js';

let camera, controls, scene, renderer, tiles;
let statsContainer, stats;

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;

const apiKey = localStorage.getItem( 'googleApiKey' ) ?? 'put-your-api-key-here';

const params = {

	'enableUpdate': true,
	'enableCacheDisplay': false,
	'enableRendererStats': false,
	'apiKey': apiKey,

	'displayBoxBounds': false,
	'displaySphereBounds': false,
	'displayRegionBounds': false,
	'reload': reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	localStorage.setItem( 'googleApiKey', params.apiKey );

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

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

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( 7326000, 10279000, - 823000 );

	// controls
	controls = new MapControls( camera, renderer.domElement );
	controls.minDistance = 1;
	controls.maxDistance = Infinity;
	controls.minPolarAngle = Math.PI / 4;
	controls.target.set( 0, 0, 1 );

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const mapsOptions = gui.addFolder( 'Google Tiles' );
	mapsOptions.add( params, 'apiKey' );
	mapsOptions.add( params, 'reload' );
	mapsOptions.open();

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'displaySphereBounds' );
	debug.add( params, 'displayRegionBounds' );

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'enableUpdate' ).onChange( v => {

		tiles.parseQueue.autoUpdate = v;
		tiles.downloadQueue.autoUpdate = v;

		if ( v ) {

			tiles.parseQueue.scheduleJobRun();
			tiles.downloadQueue.scheduleJobRun();

		}

	} );
	exampleOptions.add( params, 'enableCacheDisplay' );
	exampleOptions.add( params, 'enableRendererStats' );
	gui.open();

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

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );

}

function updateControls() {

	const raycaster = new Raycaster();
	raycaster.ray.origin.copy( controls.target ).normalize().multiplyScalar( WGS84_RADIUS * 1.5 );
	raycaster.ray.direction.copy( raycaster.ray.origin ).normalize().multiplyScalar( - 1 );
	raycaster.firstHitOnly = true;

	const hit = raycaster.intersectObject( scene, true )[ 0 ];
	if ( hit ) {

		controls.target.copy( hit.point );

	} else {

		controls.target.normalize().multiplyScalar( WGS84_RADIUS );

	}
	controls.panPlane.copy( controls.target ).normalize();

	const dist = camera.position.length();
	camera.position.copy( controls.target ).normalize().multiplyScalar( dist );
	camera.lookAt( controls.target );
	controls.update();

	const box = new Box3();
	tiles.getBounds( box );

	camera.far = dist;
	camera.near = Math.max( 1, dist - Math.max( ...box.min, ...box.max ) );
	camera.updateProjectionMatrix();

}

function updateHash() {

	if ( ! tiles ) {

		return;

	}

	const res = {};
	const mat = tiles.group.matrixWorld.clone().invert();
	const vec = controls.target.clone().applyMatrix4( mat );
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );

	res.lat *= MathUtils.RAD2DEG;
	res.lon *= MathUtils.RAD2DEG;
	window.history.replaceState( undefined, undefined, `#${ res.lat.toFixed( 4 ) },${ res.lon.toFixed( 4 ) }` );

}

function initFromHash() {

	const hash = window.location.hash.replace( /^#/, '' );
	const tokens = hash.split( /,/g ).map( t => parseFloat( t ) );
	if ( tokens.length !== 2 || tokens.findIndex( t => Number.isNaN( t ) ) !== - 1 ) {

		return;

	}

	const [ lat, lon ] = tokens;
	WGS84_ELLIPSOID.getCartographicToPosition( lat * MathUtils.DEG2RAD, lon * MathUtils.DEG2RAD, 0, controls.target );

	tiles.group.updateMatrixWorld();
	controls.target.applyMatrix4( tiles.group.matrixWorld );
	updateControls();

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	updateControls();

	// update options
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// update tiles
	if ( params.enableUpdate ) {

		camera.updateMatrixWorld();
		tiles.update();

	}

	render();
	stats.update();

}

function render() {

	// render primary view
	renderer.render( scene, camera );

	// render html text updates
	const cacheFullness = tiles.lruCache.itemList.length / tiles.lruCache.maxSize;
	let str = `Downloading: ${ tiles.stats.downloading } Parsing: ${ tiles.stats.parsing } Visible: ${ tiles.visibleTiles.size }`;

	if ( params.enableCacheDisplay ) {

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

			count += BufferGeometryUtils.estimateBytesUsed( g );

		} );
		str += `<br/>Cache: ${ ( 100 * cacheFullness ).toFixed( 2 ) }% ~${ ( count / 1000 / 1000 ).toFixed( 2 ) }mb`;

	}

	if ( params.enableRendererStats ) {

		const memory = renderer.info.memory;
		const programCount = renderer.info.programs.length;
		str += `<br/>Geometries: ${ memory.geometries } Textures: ${ memory.textures } Programs: ${ programCount }`;

	}

	if ( statsContainer.innerHTML !== str ) {

		statsContainer.innerHTML = str;

	}

	if ( tiles ) {

		const mat = tiles.group.matrixWorld.clone().invert();
		const vec = camera.position.clone().applyMatrix4( mat );

		const res = {};
		WGS84_ELLIPSOID.getPositionToCartographic( vec, res );
		document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + tiles.getCreditsString();

	}

}
