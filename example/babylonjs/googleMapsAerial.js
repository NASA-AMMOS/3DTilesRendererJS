import { Scene, Engine, GeospatialCamera, Vector3 } from '@babylonjs/core';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = 2275207;

const PLANET_RADIUS = 6378137;

/**
 * Dynamically adjust near/far planes based on camera altitude
 * to prevent clipping while maintaining depth precision
 */
function updateCameraClipPlanes( camera ) {

	// radius IS the altitude above surface for GeospatialCamera
	const altitude = Math.max( 1, camera.radius );
	const horizonDist = Math.sqrt( 2 * PLANET_RADIUS * altitude );
	camera.maxZ = Math.max( horizonDist * 2, altitude * 10 );

}

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
const engine = new Engine( canvas, true, { useLargeWorldRendering: true } );
engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );

// scene
const scene = new Scene( engine );
// 3D Tiles data uses right-handed coordinate system
scene.useRightHandedSystem = true;

// camera
const camera = new GeospatialCamera( 'geo', scene, { planetRadius: PLANET_RADIUS } );

camera.attachControl( true );
camera.minZ = 1;
camera.maxZ = 1e7;

// Start at ~1000m altitude above surface
camera.radius = 1000;
// Set center to Tokyo Tower location (ECEF coordinates)
camera.center = new Vector3( 0, - 6370877.772522855 - 150, 20246.934953993885 );
camera.checkCollisions = true;
scene.collisionsEnabled = true;
camera.limits.radiusMin = 10; // minimum 10m above surface
camera.limits.pitchMax = Math.PI / 2 - .02;
camera.limits.pitchMin = 0;
camera.movement.zoomSpeed = 2;


// const camera = new ArcRotateCamera(
// 	'camera',
// 	- Math.PI / 2,
// 	Math.PI / 3,
// 	100000,
// 	new Vector3( 0, 0, 0 ),
// 	scene,
// );
// camera.attachControl( canvas, true );
// camera.minZ = 1;
// camera.maxZ = 1e7;
// camera.wheelPrecision = 0.25;
// camera.setPosition( new Vector3( 500, 300, - 500 ) );

// tiles
const tiles = new TilesRenderer( null, scene );
tiles.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken: import.meta.env.VITE_ION_KEY,
	assetId: GOOGLE_TILES_ASSET_ID,
	autoRefreshToken: true,
} ) );
tiles.errorTarget = params.errorTarget;

// // position so Tokyo Tower is visible
// tiles.group.rotation.set( - 0.6223599766516501, 8.326672684688674e-17, - 0.8682210177215869 );
//tiles.group.position.set( 0, - 6370877.772522855 - 150, 20246.934953993885 );

// Babylon render loop
scene.onBeforeRenderObservable.add( () => {

	// Dynamically adjust clip planes based on camera altitude
	updateCameraClipPlanes( camera );

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
