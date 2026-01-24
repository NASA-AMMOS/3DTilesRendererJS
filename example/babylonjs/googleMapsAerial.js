import { Scene, Engine, GeospatialCamera, Vector3 } from '@babylonjs/core';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = 2275207;

const PLANET_RADIUS = 6378137;

function updateCameraClipPlanes( camera ) {

	const altitude = Math.max( 1, camera.radius );
	const pitch = camera.pitch; // 0 = looking down, π/2 = looking at horizon

	// Near plane calculation:
	// - When looking down (pitch ≈ 0): nearest visible point is roughly at altitude distance
	// - When looking at horizon (pitch ≈ π/2): nearby terrain can be much closer

	// Use pitch to blend between a small near (for horizontal view) and altitude-based near (for top-down)
	const pitchFactor = Math.sin( pitch ); // 0 when looking down, 1 at horizon
	const minNearHorizontal = 1; // When looking horizontally, need small near plane
	const minNearVertical = Math.max( 1, altitude * 0.01 ); // When looking down, can use larger near
	camera.minZ = minNearHorizontal + ( minNearVertical - minNearHorizontal ) * ( 1 - pitchFactor );

	// Far plane: see to the horizon and beyond
	const horizonDist = Math.sqrt( 2 * PLANET_RADIUS * altitude + altitude * altitude );
	camera.maxZ = horizonDist + PLANET_RADIUS * 0.1;

}

// gui
const params = {
	enabled: true,
	visibleTiles: 0,
	errorTarget: 20,
	minZ: 0,
	maxZ: 0,
};

const gui = new GUI();
gui.add( params, 'enabled' );
gui.add( params, 'visibleTiles' ).name( 'Visible Tiles' ).listen().disable();
gui.add( params, 'errorTarget', 1, 100 );
gui.add( params, 'minZ' ).name( 'Camera MinZ' ).listen().disable();
gui.add( params, 'maxZ' ).name( 'Camera MaxZ' ).listen().disable();

// engine
const canvas = document.getElementById( 'renderCanvas' );
const engine = new Engine( canvas, true, { useLargeWorldRendering: true } );
engine.useReverseDepthBuffer = true;
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

// Start farther out, then fly in once tiles are loaded
camera.radius = 50000;

// Set center to Tokyo Tower location (ECEF coordinates)
// Tokyo Tower: 35.6586° N, 139.7454° E
camera.center = new Vector3( - 3959611.825621192, 3352599.0363458656, 3697549.0362687325 );
camera.pitch = 1.167625429373872;
camera.yaw = - 0.2513281792775774;

camera.checkCollisions = true;
scene.collisionsEnabled = true;
camera.limits.radiusMin = 10;
camera.limits.pitchMax = Math.PI / 2 - .02;
camera.limits.pitchMin = 0;
camera.movement.zoomSpeed = 2;

// Fly to close view once tiles load
let hasZoomedIn = false;

// tiles
const tiles = new TilesRenderer( null, scene );
tiles.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken: import.meta.env.VITE_ION_KEY,
	assetId: GOOGLE_TILES_ASSET_ID,
	autoRefreshToken: true,
} ) );
tiles.errorTarget = params.errorTarget;

// Babylon render loop
scene.onAfterRenderObservable.add( () => {

	updateCameraClipPlanes( camera );

} );

scene.onBeforeRenderObservable.add( () => {


	if ( params.enabled ) {

		tiles.errorTarget = params.errorTarget;
		tiles.update();
		params.visibleTiles = tiles.visibleTiles.size;
		params.minZ = camera.minZ;
		params.maxZ = camera.maxZ;


		// Once we have some tiles visible, fly in to target
		if ( ! hasZoomedIn && tiles.visibleTiles.size > 5 ) {

			hasZoomedIn = true;
			camera.flyToAsync( undefined, undefined, 300, undefined, 2000 );

		}

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
