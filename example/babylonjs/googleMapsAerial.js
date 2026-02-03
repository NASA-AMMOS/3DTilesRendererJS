import { Scene, Engine, GeospatialCamera, Vector3, Color4 } from '@babylonjs/core';
import { GeospatialClippingBehavior } from '@babylonjs/core/Behaviors/Cameras';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = 2275207;

const PLANET_RADIUS = 6378137;

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
engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );

// scene
const scene = new Scene( engine );
scene.clearColor = new Color4( 0.05, 0.05, 0.05, 1 );

// 3D Tiles data uses right-handed coordinate system
scene.useRightHandedSystem = true;

// camera
const camera = new GeospatialCamera( 'geo', scene, { planetRadius: PLANET_RADIUS } );

camera.attachControl( true );
const clippingBehavior = new GeospatialClippingBehavior();
camera.addBehavior( clippingBehavior );

// Start farther out, then fly in once tiles are loaded
camera.radius = 50000;

// Set center to Tokyo Tower location (ECEF coordinates)
// Tokyo Tower: 35.6586° N, 139.7454° E
camera.center = new Vector3( - 3959611.825621192, 3352599.0363458656, 3697549.0362687325 );
camera.pitch = 1.167625429373872;
camera.yaw = - 0.2513281792775774;

camera.checkCollisions = true;
scene.collisionsEnabled = true;

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
