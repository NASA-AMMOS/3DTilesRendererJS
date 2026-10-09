import {
	Application,
	Color,
	createGraphicsDevice,
	DEVICETYPE_WEBGL2,
	DEVICETYPE_WEBGPU,
	Entity,
	FILLMODE_FILL_WINDOW,
	Mat4,
	math,
	MiniStats,
	RESOLUTION_AUTO,
	Vec2,
	Vec3,
} from 'playcanvas';
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { DebugTilesPlugin, ReorientationPlugin, TilesFadePlugin } from '3d-tiles-renderer/playcanvas/plugins';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = '2275207';

// Tokyo Tower, the same default location as the three.js demo
const DEFAULT_LOCATION = [ 35.6586, 139.7454 ];

const params = {
	enabled: true,
	errorTarget: 16,
	fade: true,
	displayBoxBounds: false,
	displayParentBounds: false,
	miniStats: false,
	visibleTiles: 0,
	memory: '',
};

// init the graphics device and application, add "?webgpu" to the URL to use WebGPU
const canvas = document.getElementById( 'renderCanvas' );
const useWebGPU = new URLSearchParams( window.location.search ).has( 'webgpu' );
const device = await createGraphicsDevice( canvas, {
	deviceTypes: useWebGPU ? [ DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2 ] : [ DEVICETYPE_WEBGL2 ],
} );
device.maxPixelRatio = window.devicePixelRatio;

const app = new Application( canvas, { graphicsDevice: device } );
app.setCanvasFillMode( FILLMODE_FILL_WINDOW );
app.setCanvasResolution( RESOLUTION_AUTO );
app.start();

window.addEventListener( 'resize', () => {

	app.resizeCanvas();

} );

// camera orbiting the location, kept above the horizon
const camera = new Entity( 'camera' );
camera.addComponent( 'camera', {
	clearColor: new Color( 0.08, 0.11, 0.12 ),
	nearClip: 10,
	farClip: 1600000,
} );
camera.setPosition( 500, 500, 500 );
camera.addComponent( 'script' );
app.root.addChild( camera );

const cameraControls = camera.script.create( CameraControls );
cameraControls.enableFly = false;
cameraControls.enablePan = false;
cameraControls.zoomRange = new Vec2( 200, 20000 );
cameraControls.pitchRange = new Vec2( - 90, - 15 );
cameraControls.focusPoint = new Vec3( 0, 0, 0 );

// tiles, authenticated through Cesium Ion and moved so the location is at the origin with +Y up
const tiles = new TilesRenderer( null, app );
tiles.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken: import.meta.env.VITE_ION_KEY,
	assetId: GOOGLE_TILES_ASSET_ID,
	autoRefreshToken: true,
} ) );

const reorientationPlugin = new ReorientationPlugin( {
	lat: DEFAULT_LOCATION[ 0 ] * math.DEG_TO_RAD,
	lon: DEFAULT_LOCATION[ 1 ] * math.DEG_TO_RAD,
} );
tiles.registerPlugin( reorientationPlugin );
tiles.setCamera( camera.camera );
app.root.addChild( tiles.group );

// fade tiles in and out as the level of detail changes, a new plugin is registered each time it
// is enabled
let fadePlugin = null;
function setFade( enabled ) {

	if ( enabled && ! fadePlugin ) {

		fadePlugin = new TilesFadePlugin();
		tiles.registerPlugin( fadePlugin );

	} else if ( ! enabled && fadePlugin ) {

		tiles.unregisterPlugin( fadePlugin );
		fadePlugin = null;

	}

}

setFade( params.fade );

// draw the bounding volumes of the visible tiles
const debugPlugin = new DebugTilesPlugin();
tiles.registerPlugin( debugPlugin );

// set the location from the "#lat,lon" hash in degrees, with an optional height in meters for
// places well above sea level, as the camera orbits the location at the given height
function initFromHash() {

	const tokens = window.location.hash.replace( /^#/, '' ).split( /,/g ).map( t => parseFloat( t ) );
	if ( tokens.length < 2 || tokens.length > 3 || tokens.some( t => Number.isNaN( t ) ) ) {

		return;

	}

	const [ lat, lon, height = 0 ] = tokens;
	reorientationPlugin.lat = lat * math.DEG_TO_RAD;
	reorientationPlugin.lon = lon * math.DEG_TO_RAD;
	reorientationPlugin.height = height;
	reorientationPlugin.transformLatLonHeightToOrigin( reorientationPlugin.lat, reorientationPlugin.lon, height );

}

window.addEventListener( 'hashchange', initFromHash );
initFromHash();

// update the tiles after the camera controls have moved the camera
const credits = document.getElementById( 'credits' );
const tilesetTransform = new Mat4();
const worldToTileset = new Mat4();
const cameraPosition = new Vec3();
const cartographic = {};
app.on( 'update', () => {

	tiles.errorTarget = params.errorTarget;
	debugPlugin.displayBoxBounds = params.displayBoxBounds;
	debugPlugin.displayParentBounds = params.displayParentBounds;
	if ( params.enabled ) {

		tiles.update();

	}

	params.visibleTiles = tiles.visibleTiles.size;
	params.memory = `${ ( tiles.lruCache.cachedBytes / 1e6 ).toFixed( 1 ) } MB`;

	// the camera location and the data attributions, which Google requires to be displayed - the
	// location only needs to be approximate, so a 32-bit matrix is fine for it
	tiles.getTilesetTransform( tilesetTransform.data );
	worldToTileset.mul2( tiles.group.getWorldTransform(), tilesetTransform ).invert();
	worldToTileset.transformPoint( camera.getPosition(), cameraPosition );
	tiles.ellipsoid.getPositionToCartographic( cameraPosition, cartographic );

	const attributions = tiles.getAttributions()[ 0 ]?.value || '';
	credits.innerText = `${ toLatLonString( cartographic.lat, cartographic.lon ) }\n${ attributions }`;

} );

function toLatLonString( lat, lon ) {

	const latDeg = lat * math.RAD_TO_DEG;
	const lonDeg = lon * math.RAD_TO_DEG;
	return `${ Math.abs( latDeg ).toFixed( 4 ) }° ${ latDeg < 0 ? 'S' : 'N' } ${ Math.abs( lonDeg ).toFixed( 4 ) }° ${ lonDeg < 0 ? 'W' : 'E' }`;

}

// performance overlay, created on first use
let miniStats = null;
function setMiniStats( enabled ) {

	if ( enabled && ! miniStats ) {

		miniStats = new MiniStats( app );

	}

	if ( miniStats ) {

		miniStats.enabled = enabled;

	}

}

// gui
const gui = new GUI();
gui.add( params, 'enabled' );
gui.add( params, 'errorTarget', 1, 64 );
gui.add( params, 'fade' ).onChange( setFade );
gui.add( params, 'displayBoxBounds' );
gui.add( params, 'displayParentBounds' );
gui.add( params, 'miniStats' ).onChange( setMiniStats );
gui.add( params, 'visibleTiles' ).listen().disable();
gui.add( params, 'memory' ).listen().disable();
