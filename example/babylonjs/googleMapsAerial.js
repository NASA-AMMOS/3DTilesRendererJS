import * as BABYLON from 'babylonjs';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = 2275207;

// gui
const params = {
	enabled: true,
	visibleTiles: 0,
	errorTarget: 20,
};

const gui = new GUI();
gui.add( params, 'enabled' );
gui.add( params, 'visibleTiles' ).name( 'Visible Tiles' ).listen().disable();
gui.add( params, 'errorTarget', 1, 100 );

// engine
const canvas = document.getElementById( 'renderCanvas' );
const engine = new BABYLON.Engine( canvas, true );
engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );

// scene
const scene = new BABYLON.Scene( engine );
scene.useRightHandedSystem = true;

// camera
const camera = new BABYLON.ArcRotateCamera(
	'camera',
	- Math.PI / 2,
	Math.PI / 3,
	100000,
	new BABYLON.Vector3( 0, 0, 0 ),
	scene,
);
camera.attachControl( canvas, true );
camera.minZ = 1;
camera.maxZ = 1e7;
camera.wheelPrecision = 0.25;
camera.setPosition( new BABYLON.Vector3( 500, 300, - 500 ) );

// tiles
const tiles = new TilesRenderer( null, scene );
tiles.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken: import.meta.env.VITE_ION_KEY,
	assetId: GOOGLE_TILES_ASSET_ID,
	autoRefreshToken: true,
} ) );
tiles.errorTarget = params.errorTarget;

// position so Tokyo Tower is visible
tiles.group.rotation.set( - 0.6223599766516501, 8.326672684688674e-17, - 0.8682210177215869 );
tiles.group.position.set( 0, - 6370877.772522855 - 150, 20246.934953993885 );

// Babylon render loop
scene.onBeforeRenderObservable.add( () => {

	if ( params.enabled ) {

		tiles.errorTarget = params.errorTarget;
		tiles.update();
		params.visibleTiles = tiles.visibleTiles.size;

	}

	// update attributions
	const attributions = tiles.getAttributions();
	const creditsEl = document.getElementById( 'credits' );
	creditsEl.innerText = attributions[ 0 ]?.value || '';

} );

engine.runRenderLoop( () => {

	scene.render();

} );

// Handle window resize
window.addEventListener( 'resize', () => {

	engine.resize();

} );
