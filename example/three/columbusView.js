import {
	EnvironmentControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	CesiumIonAuthPlugin,
	DebugTilesPlugin,
	GLTFExtensionsPlugin,
	TileCompressionPlugin,
	UnloadTilesPlugin,
	UpdateOnChangePlugin,
} from '3d-tiles-renderer/plugins';
import {
	Box3,
	MathUtils,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { ColumbusViewPlugin } from './src/plugins/ColumbusViewPlugin.js';

// the view is framed over lower Manhattan on load
const INITIAL_LAT = 40.7128 * MathUtils.DEG2RAD;
const INITIAL_LON = - 74.0060 * MathUtils.DEG2RAD;
const INITIAL_HEIGHT = 800;

let camera, controls, scene, renderer, tiles, stats, statsContainer;

const _target = new Vector3();
const _box = new Box3();

const params = {

	scheme: 'EPSG:3857',
	errorTarget: 24,

	enableDebug: true,
	displayBoxBounds: true,
	displayParentBounds: false,
	colorMode: DebugTilesPlugin.ColorModes.NONE,
	boundsColorMode: DebugTilesPlugin.ColorModes.NONE,
	unlit: false,

	reload: reload,

};

init();
animate();

// re-creates the tile set, keeping the camera over the same ground position. The same point maps
// to a different coordinate in each projection, so the camera has to be converted through lat /
// lon rather than left where it was.
function reload() {

	const plugin = tiles?.getPluginByName( 'COLUMBUS_VIEW_PLUGIN' );
	const { x, y, z } = camera.position;

	reinstantiateTiles( plugin ? plugin.unprojectPoint( x, y, z ) : null );

}

function reinstantiateTiles( cartographic = null ) {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
	// flatten the globe into the map projection. This is registered before the compression
	// plugin so the rewritten positions and normals are what get compressed.
	tiles.registerPlugin( new ColumbusViewPlugin( { scheme: params.scheme } ) );

	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new UnloadTilesPlugin() );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader(),
	} ) );

	// the bounds helpers are drawn from the reprojected bounding volumes, so they show where the
	// renderer thinks each tile lives in the flattened frame
	tiles.registerPlugin( new DebugTilesPlugin( {
		displayBoxBounds: params.displayBoxBounds,
	} ) );

	// the plugin produces a y-up frame so the group needs no rotation
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	frameView( cartographic );

}

// places the camera over the given lat / lon in the flattened frame, or over the initial location
// if none is given
function frameView( cartographic = null ) {

	const plugin = tiles.getPluginByName( 'COLUMBUS_VIEW_PLUGIN' );

	if ( cartographic ) {

		// every projection here is y-up with x running east and z running south, so the camera
		// orientation carries over and only the position has to be converted
		plugin.projectPoint( cartographic.lon, cartographic.lat, cartographic.height, camera.position );

	} else {

		plugin.projectPoint( INITIAL_LON, INITIAL_LAT, 0, _target );
		plugin.projectPoint( INITIAL_LON, INITIAL_LAT, INITIAL_HEIGHT, camera.position );

		// pull the camera back to the south so the view is angled rather than straight down
		camera.position.z += INITIAL_HEIGHT;
		camera.lookAt( _target );

	}

	camera.updateMatrixWorld();

	// the controls hold a pivot point, an up vector and inertia expressed in the previous
	// projection. Left alone they apply deltas against a pivot that can be hundreds of kilometers
	// from the camera and throw it off the map on the next interaction.
	controls.setCamera( camera );
	controls.pivotPoint.copy( camera.position );
	controls.dragInertia.setScalar( 0 );
	controls.rotationInertia.setScalar( 0 );

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );

	// controls. The flattened frame is y-up, which is what the controls already assume.
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.enableDamping = true;
	controls.minDistance = 10;
	controls.cameraRadius = 5;

	// initialize tiles
	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	gui.add( params, 'scheme', [ 'EPSG:3857', 'EPSG:4326' ] ).name( 'projection' ).onChange( reload );
	gui.add( params, 'errorTarget', 5, 100, 1 ).onChange( () => {

		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'reload' );

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'enableDebug' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'displayParentBounds' );
	debug.add( params, 'colorMode', DebugTilesPlugin.ColorModes );
	debug.add( params, 'boundsColorMode', DebugTilesPlugin.ColorModes );
	debug.add( params, 'unlit' );
	debug.open();

	// tile counts, to distinguish tiles failing to load from tiles landing somewhere unexpected
	statsContainer = document.createElement( 'div' );
	document.getElementById( 'info' ).appendChild( statsContainer );

	// stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	// ensure transforms are up to date for the controls update
	scene.updateMatrixWorld();

	controls.update();
	camera.updateMatrixWorld();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );
	tiles.errorTarget = params.errorTarget;

	const debugPlugin = tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' );
	debugPlugin.enabled = params.enableDebug;
	debugPlugin.displayBoxBounds = params.displayBoxBounds;
	debugPlugin.displayParentBounds = params.displayParentBounds;
	debugPlugin.colorMode = parseFloat( params.colorMode );
	debugPlugin.boundsColorMode = parseFloat( params.boundsColorMode );
	debugPlugin.unlit = params.unlit;

	tiles.update();

	renderer.render( scene, camera );
	stats.update();

	updateHtml();

}

function updateHtml() {

	const { stats: tileStats, visibleTiles, activeTiles } = tiles;

	// where the camera sits relative to the tiles, so a placement problem is visible even when
	// nothing is on screen
	const root = tiles.root?.engineData?.boundingVolume;
	let rootStr = 'root: none';
	if ( root ) {

		root.getAABB( _box );
		rootStr = _box.isEmpty() ? 'root: empty bounds' :
			`root x [ ${ _box.min.x.toFixed( 0 ) }, ${ _box.max.x.toFixed( 0 ) } ] ` +
			`y [ ${ _box.min.y.toFixed( 0 ) }, ${ _box.max.y.toFixed( 0 ) } ] ` +
			`z [ ${ _box.min.z.toFixed( 0 ) }, ${ _box.max.z.toFixed( 0 ) } ]`;

	}

	// the refinement decision itself. A tile splits when its error exceeds the error target, so if
	// the largest visible error sits below the target then refinement stopped legitimately and the
	// camera is simply too far away. If it sits above the target then something is blocking the
	// traversal instead.
	let maxDepth = - 1;
	let maxError = 0;
	let maxGeometricError = 0;
	let scaleStr = '';
	visibleTiles.forEach( tile => {

		maxDepth = Math.max( maxDepth, tile.internal.depth );
		maxError = Math.max( maxError, tile.traversal.error );

		if ( tile.geometricError > maxGeometricError ) {

			maxGeometricError = tile.geometricError;

			// how much of that error is the projection scaling, and over what latitudes
			const scale = tile.columbusErrorScale ?? 1;
			const range = tile.columbusRange;
			scaleStr =
				` (raw ${ ( tile.geometricError / scale ).toFixed( 1 ) } x${ scale.toFixed( 2 ) }` +
				( range ? `, lat ${ ( range[ 1 ] * MathUtils.RAD2DEG ).toFixed( 1 ) } to ` +
					`${ ( range[ 3 ] * MathUtils.RAD2DEG ).toFixed( 1 ) }` : '' ) + ')';

		}

	} );

	const str =
		`Queued: ${ tileStats.queued } Downloading: ${ tileStats.downloading } ` +
		`Parsing: ${ tileStats.parsing } Loaded: ${ tileStats.loaded } Failed: ${ tileStats.failed }<br/>` +
		`Visible: ${ visibleTiles.size } Active: ${ activeTiles.size }<br/>` +
		`Depth: ${ maxDepth } MaxError: ${ maxError.toFixed( 1 ) } / ${ params.errorTarget } ` +
		`GeomError: ${ maxGeometricError.toFixed( 1 ) }${ scaleStr }<br/>` +
		`Camera: ${ camera.position.toArray().map( v => v.toFixed( 0 ) ).join( ', ' ) }<br/>` +
		`${ rootStr }`;

	if ( statsContainer.innerHTML !== str ) {

		statsContainer.innerHTML = str;

	}

	document.getElementById( 'credits' ).innerText = tiles.getAttributions()[ 0 ]?.value || '';

}
