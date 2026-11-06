import {
	AppBase,
	AppOptions,
	CameraComponentSystem,
	Color,
	ContainerHandler,
	createGraphicsDevice,
	DEVICETYPE_WEBGL2,
	DEVICETYPE_WEBGPU,
	Entity,
	FILLMODE_FILL_WINDOW,
	RenderComponentSystem,
	RESOLUTION_AUTO,
	ScriptComponentSystem,
	TextureHandler,
	Vec3,
} from 'playcanvas';
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import { TilesRenderer } from '3d-tiles-renderer/playcanvas';
import { TilesFadePlugin } from '3d-tiles-renderer/playcanvas/plugins';
import GUI from 'lil-gui';

const DEFAULT_TILESET_URL = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';
const searchParams = new URLSearchParams( location.search );
const TILESET_URL = searchParams.get( 'url' ) || DEFAULT_TILESET_URL;
const usesBundledTiles = TILESET_URL.startsWith( '/data/' );

const params = {
	useFade: true,
	fadeRootTiles: false,
	fadeDuration: Number( searchParams.get( 'fadeDuration' ) ?? 0.5 ),
	errorTarget: Number( searchParams.get( 'errorTarget' ) ?? 6 ),
	renderScale: 1,
	fadingTiles: '0 tiles',
	visibleTiles: '0 tiles',
};

// init the graphics device and application, add "?webgpu" to the URL to use WebGPU
const canvas = document.getElementById( 'renderCanvas' );
const useWebGPU = searchParams.has( 'webgpu' );
const device = await createGraphicsDevice( canvas, {
	deviceTypes: useWebGPU ? [ DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2 ] : [ DEVICETYPE_WEBGL2 ],
} );
device.maxPixelRatio = window.devicePixelRatio;
document.getElementById( 'backend' ).textContent = device.isWebGPU ? 'WebGPU' : 'WebGL2';

const createOptions = new AppOptions();
createOptions.graphicsDevice = device;
createOptions.componentSystems = [ RenderComponentSystem, CameraComponentSystem, ScriptComponentSystem ];
createOptions.resourceHandlers = [ TextureHandler, ContainerHandler ];

const app = new AppBase( canvas );
app.init( createOptions );
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
camera.addComponent( 'script' );
app.root.addChild( camera );

const focus = usesBundledTiles ? new Vec3( 216, - 77, 32 ) : new Vec3( 0, 0, 0 );
const distance = usesBundledTiles ? 400 : 30;
camera.setPosition( focus.x + distance * 0.6, focus.y + distance * 0.4, focus.z + distance * 0.7 );
const cameraControls = camera.script.create( CameraControls );
cameraControls.focusPoint = focus;

// instantiate the tiles renderer with the fade plugin, and orient the group so it's Z+ down
const tiles = new TilesRenderer( TILESET_URL, app );
tiles.fetchOptions.mode = 'cors';
tiles.setCamera( camera.camera );
tiles.group.setLocalEulerAngles( 90, 0, 0 );
app.root.addChild( tiles.group );

const fadePlugin = new TilesFadePlugin();
tiles.registerPlugin( fadePlugin );

// update the tiles after the camera controls have moved the camera
app.on( 'update', () => {

	fadePlugin.fadeRootTiles = params.fadeRootTiles;
	fadePlugin.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
	tiles.errorTarget = params.errorTarget;
	tiles.update();

	params.fadingTiles = fadePlugin.fadingTiles + ' tiles';
	params.visibleTiles = tiles.visibleTiles.size + ' tiles';

} );

// gui
const gui = new GUI();
const fadeFolder = gui.addFolder( 'fade' );
fadeFolder.add( params, 'useFade' );
fadeFolder.add( params, 'fadeRootTiles' );
fadeFolder.add( params, 'fadeDuration', 0, 5 ).listen();
fadeFolder.add( params, 'errorTarget', 0, 1000 );
fadeFolder.add( params, 'renderScale', 0.1, 1, 0.05 ).onChange( value => {

	device.maxPixelRatio = value * window.devicePixelRatio;

} );
fadeFolder.add( params, 'fadingTiles' ).listen().disable();
fadeFolder.add( params, 'visibleTiles' ).listen().disable();
gui.open();
