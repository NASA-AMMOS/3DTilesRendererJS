import {
	Application,
	Color,
	createGraphicsDevice,
	DEVICETYPE_WEBGL2,
	DEVICETYPE_WEBGPU,
	Entity,
	FILLMODE_FILL_WINDOW,
	MiniStats,
	RESOLUTION_AUTO,
	Vec3,
} from 'playcanvas';
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { DebugTilesPlugin, TilesFadePlugin } from '3d-tiles-renderer/playcanvas/plugins';
import GUI from 'lil-gui';

const TILESET_URL = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

const params = {
	enabled: true,
	errorTarget: 16,
	useFade: true,
	fadeDuration: 0.25,
	fadingTiles: '0 tiles',
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

// camera with orbit controls
const camera = new Entity( 'camera' );
camera.addComponent( 'camera', {
	clearColor: new Color( 0.05, 0.05, 0.05 ),
	nearClip: 0.1,
	farClip: 4000,
} );
camera.setPosition( 20, 10, 20 );
camera.addComponent( 'script' );
app.root.addChild( camera );

const cameraControls = camera.script.create( CameraControls );
cameraControls.focusPoint = new Vec3( 0, 0, 0 );

// instantiate the tiles renderer and orient the group so it's Z+ down
const tiles = new TilesRenderer( TILESET_URL, app );
tiles.fetchOptions.mode = 'cors';
tiles.setCamera( camera.camera );
tiles.group.setLocalEulerAngles( 90, 0, 0 );
app.root.addChild( tiles.group );

// fade tiles in and out as the level of detail changes
const fadePlugin = new TilesFadePlugin();
tiles.registerPlugin( fadePlugin );

// draw the bounding volumes of the visible tiles
const debugPlugin = new DebugTilesPlugin();
tiles.registerPlugin( debugPlugin );

// update the tiles after the camera controls have moved the camera
app.on( 'update', () => {

	tiles.errorTarget = params.errorTarget;
	fadePlugin.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	debugPlugin.displayBoxBounds = params.displayBoxBounds;
	debugPlugin.displayParentBounds = params.displayParentBounds;
	if ( params.enabled ) {

		tiles.update();

	}

	params.visibleTiles = tiles.visibleTiles.size;
	params.fadingTiles = `${ fadePlugin.fadingTiles } tiles`;
	params.memory = `${ ( tiles.lruCache.cachedBytes / 1e6 ).toFixed( 1 ) } MB`;

} );

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
gui.add( params, 'displayBoxBounds' );
gui.add( params, 'displayParentBounds' );
gui.add( params, 'miniStats' ).onChange( setMiniStats );
gui.add( params, 'visibleTiles' ).listen().disable();
gui.add( params, 'memory' ).listen().disable();

const fadeFolder = gui.addFolder( 'fade' );
fadeFolder.add( params, 'useFade' );
fadeFolder.add( params, 'fadeDuration', 0, 5 );
fadeFolder.add( params, 'fadingTiles' ).listen().disable();
