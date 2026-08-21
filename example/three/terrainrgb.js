import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
	Raycaster,
	Vector3,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { DebugTilesPlugin, TerrainRGBMeshPlugin, TerrariumMeshPlugin, XYZTilesOverlay, TilesFadePlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const PROVIDERS = {

	// Terrarium tiles from the AWS terrain tiles dataset
	'Terrarium (AWS)': {
		plugin: TerrariumMeshPlugin,
		url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
		maxZoom: 15,
	},

	// Terrain-RGB tiles of the open Mapterhorn dataset hosted by Re:Earth
	'Terrain-RGB (Re:Earth)': {
		plugin: TerrainRGBMeshPlugin,
		url: 'https://terrain.reearth.land/mapterhorn-egm08/mapbox/elevation/{z}/{x}/{y}.png',
		maxZoom: 14,
	},

};

// heights are in meters while the planar world spans normalized units, one unit per the mercator
// circumference of the earth
const PLANAR_HEIGHT_SCALE = 1 / 40075017;

const options = {
	errorTarget: 2,
	provider: 'Terrarium (AWS)',
	heightScale: 1,
	unlit: false,
	planar: false,
	displayParentBounds: false,
	displayBoxBounds: false,
	displayRegionBounds: false,
};

let camera, controls, scene, renderer, tiles, terrainPlugin, debugPlugin;

init();
render();

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 );

	// lights for the displaced terrain material
	const ambientLight = new AmbientLight( 0xffffff, 1.5 );
	scene.add( ambientLight );

	const directionalLight = new DirectionalLight( 0xffffff, 2 );
	directionalLight.position.set( 1, 2, 3 );
	scene.add( directionalLight );

	window.addEventListener( 'resize', onWindowResize, false );
	onWindowResize();

	initTiles();

	// GUI
	const gui = new GUI();
	gui.add( options, 'errorTarget', 1, 40, 1 );
	gui.add( options, 'provider', Object.keys( PROVIDERS ) ).onChange( initTiles );
	gui.add( options, 'heightScale', 0, 10 ).onChange( v => {

		terrainPlugin.heightScale = options.planar ? v * PLANAR_HEIGHT_SCALE : v;
		keepCameraAboveTerrain();

	} );
	gui.add( options, 'unlit' ).onChange( initTiles );
	gui.add( options, 'planar' ).onChange( initTiles );
	gui.add( options, 'displayParentBounds' );
	gui.add( options, 'displayBoxBounds' );
	gui.add( options, 'displayRegionBounds' );

	gui.open();

}

function initTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	if ( controls ) {

		controls.dispose();

	}

	// satellite imagery draped over the generated terrain
	const overlay = new XYZTilesOverlay( {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	} );

	// tiles: the plugin generates the elevation surface, so no tileset url is needed
	const provider = PROVIDERS[ options.provider ];
	tiles = new TilesRenderer();
	terrainPlugin = new provider.plugin( {
		url: provider.url,
		maxZoom: provider.maxZoom,
		heightScale: options.planar ? options.heightScale * PLANAR_HEIGHT_SCALE : options.heightScale,
		unlit: options.unlit,
		shape: options.planar ? 'planar' : 'ellipsoid',
		overlay,
		applyOverlayTexture: true,
	} );
	tiles.registerPlugin( terrainPlugin );
	tiles.registerPlugin( new TilesFadePlugin() );

	// debug bounding volume display
	debugPlugin = new DebugTilesPlugin();
	tiles.registerPlugin( debugPlugin );
	tiles.setCamera( camera );
	scene.add( tiles.group );

	// controls
	if ( options.planar ) {

		controls = new EnvironmentControls( scene, camera, renderer.domElement );
		controls.enableDamping = true;
		controls.minDistance = 1e-4;
		controls.maxDistance = 5;
		controls.cameraRadius = 0;
		controls.fallbackPlane.normal.set( 0, 0, 1 );
		controls.up.set( 0, 0, 1 );
		controls.camera.position.set( 0, 0, 2 );
		controls.camera.quaternion.identity();

		camera.near = 1e-4;
		camera.far = 10;
		camera.updateProjectionMatrix();

	} else {

		tiles.group.rotation.x = - Math.PI / 2;

		controls = new GlobeControls( scene, camera, renderer.domElement );
		controls.setEllipsoid( tiles.ellipsoid, tiles.group );
		controls.enableDamping = true;
		controls.minDistance = 150;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		controls.camera.quaternion.identity();

	}

}

// The terrain can rise above the camera when the exaggeration is increased, so raycast down from
// far overhead and lift the camera back over the surface when it ends up underneath.
function keepCameraAboveTerrain() {

	if ( options.planar ) {

		return;

	}

	const margin = 150;
	const up = new Vector3().copy( camera.position ).normalize();
	const raycaster = new Raycaster();
	raycaster.ray.origin.copy( camera.position ).addScaledVector( up, 1e5 );
	raycaster.ray.direction.copy( up ).multiplyScalar( - 1 );

	const hit = raycaster.intersectObject( tiles.group, true )[ 0 ];
	if ( hit && hit.point.dot( up ) + margin > camera.position.dot( up ) ) {

		camera.position.copy( hit.point ).addScaledVector( up, margin );

	}

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	requestAnimationFrame( render );

	if ( ! tiles ) {

		renderer.render( scene, camera );
		return;

	}

	controls.update();
	camera.updateMatrixWorld();

	tiles.errorTarget = options.errorTarget;
	debugPlugin.displayParentBounds = options.displayParentBounds;
	debugPlugin.displayBoxBounds = options.displayBoxBounds;
	debugPlugin.displayRegionBounds = options.displayRegionBounds;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
