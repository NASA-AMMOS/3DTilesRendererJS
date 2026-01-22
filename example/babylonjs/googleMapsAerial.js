import { Scene, Engine, GeospatialCamera, Vector3 } from '@babylonjs/core';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = 2275207;

const PLANET_RADIUS = 6378137;

function updateCameraClipPlanes( camera ) {

	const altitude = Math.max( 1, camera.radius );

	// Keep minZ small to avoid frustum clipping issues when pitched
	camera.minZ = 1;

	// Far plane: see to the horizon and beyond
	const horizonDist = Math.sqrt( 2 * PLANET_RADIUS * altitude + altitude * altitude );
	camera.maxZ = horizonDist + PLANET_RADIUS * 0.1;

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
// Use logarithmic depth buffer for better precision across huge distance ranges
scene.useLogarithmicDepth = true;

// camera
const camera = new GeospatialCamera( 'geo', scene, { planetRadius: PLANET_RADIUS } );

camera.attachControl( true );
camera.minZ = 1;
camera.maxZ = 1e8; // Can use larger maxZ with logarithmic depth
camera.checkCollisions = true;
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
scene.onBeforeRenderObservable.add( () => {

	// Dynamically adjust clip planes based on camera altitude
	updateCameraClipPlanes( camera );

	if ( params.enabled ) {

		tiles.errorTarget = params.errorTarget;
		tiles.update();
		params.visibleTiles = tiles.visibleTiles.size;


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
