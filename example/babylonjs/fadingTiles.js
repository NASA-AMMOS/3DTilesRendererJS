import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { TilesFadePlugin } from '3d-tiles-renderer/babylonjs/plugins';
import GUI from 'lil-gui';

const DEFAULT_TILESET_URL = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';
const searchParams = new URLSearchParams( location.search );
const TILESET_URL = searchParams.get( 'url' ) || DEFAULT_TILESET_URL;
const usesBundledTiles = TILESET_URL.startsWith( '/data/' );
const canvas = document.getElementById( 'renderCanvas' );
const requestedWebGPU = searchParams.has( 'webgpu' );
const backendElement = document.getElementById( 'backend' );

async function createEngine() {

	if ( requestedWebGPU ) {

		if ( ! navigator.gpu ) {

			throw new Error( 'WebGPU was requested but navigator.gpu is unavailable.' );

		}

		const engine = new WebGPUEngine( canvas, {
			antialias: false,
			enableAllFeatures: true,
			setMaximumLimits: true,
			enableGPUDebugMarkers: false,
			useLargeWorldRendering: false,
		} );
		engine.enableOfflineSupport = false;
		engine.useReverseDepthBuffer = false;
		engine.compatibilityMode = true;
		await engine.initAsync();
		engine.renderEvenInBackground = true;
		engine.getCaps().parallelShaderCompile = undefined;
		return engine;

	}

	return new Engine( canvas, false, {
		useLargeWorldRendering: true,
		preserveDrawingBuffer: true,
	} );

}

async function init() {

	const engine = await createEngine();
	engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );
	backendElement.textContent = requestedWebGPU ? 'WebGPU' : 'WebGL2';

	const scene = new Scene( engine );
	scene.clearColor = new Color4( 0.05, 0.05, 0.05, 1 );
	scene.useRightHandedSystem = true;

	const camera = new ArcRotateCamera(
		'camera',
		- Math.PI / 2,
		Math.PI / 2.5,
		50,
		Vector3.Zero(),
		scene,
	);
	camera.attachControl( canvas, true );
	camera.minZ = 0.1;
	camera.maxZ = 1000;
	if ( usesBundledTiles ) {

		camera.setTarget( new Vector3( 216, - 77, 32 ) );
		camera.radius = 400;

	}

	const light = new HemisphericLight( 'light', new Vector3( 0, 1, 0 ), scene );
	light.intensity = 1.5;

	const tiles = new TilesRenderer( TILESET_URL, scene );
	tiles.group.rotation.x = Math.PI / 2;
	const fadePlugin = new TilesFadePlugin();
	tiles.registerPlugin( fadePlugin );

	const params = {
		useFade: true,
		fadeRootTiles: false,
		fadeDuration: Number( searchParams.get( 'fadeDuration' ) ?? 0.5 ),
		errorTarget: Number( searchParams.get( 'errorTarget' ) ?? 6 ),
		renderScale: 1,
		fadingTiles: '0 tiles',
		visibleTiles: '0 tiles',
	};

	const gui = new GUI();
	const fadeFolder = gui.addFolder( 'fade' );
	fadeFolder.add( params, 'useFade' );
	fadeFolder.add( params, 'fadeRootTiles' );
	fadeFolder.add( params, 'fadeDuration', 0, 5 ).listen();
	fadeFolder.add( params, 'errorTarget', 0, 1000 );
	fadeFolder.add( params, 'renderScale', 0.1, 1, 0.05 ).onChange( value => {

		engine.setHardwareScalingLevel( 1 / ( value * window.devicePixelRatio ) );

	} );
	fadeFolder.add( params, 'fadingTiles' ).listen().disable();
	fadeFolder.add( params, 'visibleTiles' ).listen().disable();
	gui.open();

	scene.onBeforeRenderObservable.add( () => {

		fadePlugin.fadeRootTiles = params.fadeRootTiles;
		fadePlugin.fadeDuration = params.useFade ? params.fadeDuration * 1000 : 0;
		tiles.errorTarget = params.errorTarget;
		tiles.update();

		params.fadingTiles = fadePlugin.fadingTiles + ' tiles';
		params.visibleTiles = tiles.visibleTiles.size + ' tiles';

	} );

	engine.runRenderLoop( () => scene.render() );
	window.addEventListener( 'resize', () => engine.resize() );

}

init().catch( error => {

	backendElement.textContent = `blocked: ${ error.message }`;
	backendElement.dataset.error = error.message;
	console.error( error );

} );
