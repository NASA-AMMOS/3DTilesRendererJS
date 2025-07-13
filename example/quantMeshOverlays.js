import {
	GlobeControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	CesiumIonAuthPlugin,
	ImageOverlayPlugin,
	CesiumIonOverlay,
	XYZTilesOverlay,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
} from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let controls, scene, renderer, tiles, camera, washingtonOverlay, baseOverlay;
let statsContainer, stats;

const params = {
	enableCacheDisplay: false,
	enableRendererStats: false,
	enableTileSplitting: true,
	mapBase: false,
	errorTarget: 2,
	opacity: 1.0,
	color: '#ffffff',

	baseOpacity: 1.0,
	baseColor: '#ffffff',

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

	washingtonOverlay = new CesiumIonOverlay( {
		opacity: params.layerOpacity,
		assetId: '3827',
		apiToken: import.meta.env.VITE_ION_KEY,
	} );

	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '1', autoRefreshToken: true } ) );
	tiles.registerPlugin( new TilesFadePlugin() );
	tiles.registerPlugin( new ImageOverlayPlugin( {
		renderer,
		overlays: [ washingtonOverlay ],
	} ) );

	updateBaseOverlay();

	tiles.group.rotation.x = - Math.PI / 2;
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera set up
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( 1150000, 3920000, 4980000 );
	camera.rotation.set( 0.381, 0.202, - 0.090 );

	// lights
	const ambientLight = new AmbientLight( 0xffffff, 0.25 );
	const dirLight = new DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 1, 1, 1 );
	camera.add( ambientLight, dirLight, dirLight.target );
	scene.add( camera );

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
	gui.add( params, 'enableCacheDisplay' );
	gui.add( params, 'enableRendererStats' );
	gui.add( params, 'enableTileSplitting' );
	gui.add( params, 'mapBase' ).name( 'OpenStreetMap' ).onChange( updateBaseOverlay );
	gui.add( params, 'errorTarget', 1, 30, 1 );

	const washingtonFolder = gui.addFolder( 'Washington DC Layer' );
	washingtonFolder.add( params, 'opacity', 0, 1 );
	washingtonFolder.addColor( params, 'color' );

	const baseFolder = gui.addFolder( 'Base Layer' );
	baseFolder.add( params, 'baseOpacity', 0, 1 ).name( 'opacity' );
	baseFolder.addColor( params, 'baseColor' ).name( 'color' );

	gui.add( params, 'reload' );

	statsContainer = document.createElement( 'div' );
	document.getElementById( 'info' ).appendChild( statsContainer );

	// Stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function updateBaseOverlay() {

	const plugin = tiles.getPluginByName( 'IMAGE_OVERLAY_PLUGIN' );
	if ( baseOverlay ) {

		plugin.deleteOverlay( baseOverlay );

	}

	if ( params.mapBase ) {

		baseOverlay = new XYZTilesOverlay( {
			url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		} );

	} else {

		baseOverlay = new CesiumIonOverlay( {
			assetId: '3954',
			apiToken: import.meta.env.VITE_ION_KEY,
		} );

	}

	plugin.addOverlay( baseOverlay, - 1 );

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

	const plugin = tiles.getPluginByName( 'IMAGE_OVERLAY_PLUGIN' );
	plugin.enableTileSplitting = params.enableTileSplitting;

	washingtonOverlay.color.set( params.color );
	washingtonOverlay.opacity = params.opacity;

	baseOverlay.color.set( params.baseColor );
	baseOverlay.opacity = params.baseOpacity;

	controls.update();

	// update options
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// update tiles
	camera.updateMatrixWorld();
	tiles.errorTarget = params.errorTarget;
	tiles.update();

	renderer.render( scene, camera );
	stats.update();

	updateHtml();

}

function updateHtml() {

	// render html text updates
	let str = '';

	if ( params.enableCacheDisplay ) {

		const lruCache = tiles.lruCache;
		const cacheFullness = lruCache.cachedBytes / lruCache.maxBytesSize;
		str += `Downloading: ${ tiles.stats.downloading } Parsing: ${ tiles.stats.parsing } Visible: ${ tiles.visibleTiles.size }<br/>`;
		str += `Cache: ${ ( 100 * cacheFullness ).toFixed( 2 ) }% ~${ ( lruCache.cachedBytes / 1000 / 1000 ).toFixed( 2 ) }mb<br/>`;

	}

	if ( params.enableRendererStats ) {

		const memory = renderer.info.memory;
		const render = renderer.info.render;
		const programCount = renderer.info.programs.length;
		str += `Geometries: ${ memory.geometries } Textures: ${ memory.textures } Programs: ${ programCount } Draw Calls: ${ render.calls }`;

	}

	if ( statsContainer.innerHTML !== str ) {

		statsContainer.innerHTML = str;

	}

}
