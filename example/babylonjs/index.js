import * as BABYLON from 'babylonjs';
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
const engine = new BABYLON.Engine( canvas, true );
engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );

// TODO: Babylon uses left handed coordinate system but our data is in a right handed one.
// The coordinate system flag may need to be accounted for when parsing the data
const scene = new BABYLON.Scene( engine );
scene.useRightHandedSystem = true;

// Camera controls
const camera = new BABYLON.ArcRotateCamera(
	'camera',
	- Math.PI / 2,
	Math.PI / 2.5,
	50,
	new BABYLON.Vector3( 0, 0, 0 ),
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
