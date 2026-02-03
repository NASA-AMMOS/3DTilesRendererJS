import { Engine, Scene, ArcRotateCamera, Vector3, Color4 } from '@babylonjs/core';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import GUI from 'lil-gui';

const TILESET_URL = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

// gui
const params = {
	enabled: true,
	visibleTiles: 0,
};

const gui = new GUI();
gui.add( params, 'enabled' );
gui.add( params, 'visibleTiles' ).listen().disable();

// init engine
const canvas = document.getElementById( 'renderCanvas' );
const engine = new Engine( canvas, true, { useLargeWorldRendering: true } );
engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );

// scene
const scene = new Scene( engine );
scene.clearColor = new Color4( 0.05, 0.05, 0.05, 1 );
scene.useRightHandedSystem = true;

// Camera controls
const camera = new ArcRotateCamera(
	'camera',
	- Math.PI / 2,
	Math.PI / 2.5,
	50,
	new Vector3( 0, 0, 0 ),
	scene,
);
camera.attachControl( canvas, true );
camera.minZ = 0.1;
camera.maxZ = 1000;

// instantiate tiles renderer and orient the group so it's Z+ down
const tiles = new TilesRenderer( TILESET_URL, scene );
tiles.group.rotation.x = Math.PI / 2;

// render
scene.onBeforeRenderObservable.add( () => {

	if ( params.enabled ) {

		tiles.update();

	}

	params.visibleTiles = tiles.visibleTiles.size;

} );

engine.runRenderLoop( () => {

	scene.render();

} );

// resize
window.addEventListener( 'resize', () => {

	engine.resize();

} );
