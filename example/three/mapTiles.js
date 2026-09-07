import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	Vector2,
	Matrix4,
	MathUtils,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, GeneratedSurfacePlugin, ImageOverlayPlugin, XYZTilesOverlay, CesiumIonOverlay, PMTilesOverlay, DebugTilesPlugin, MVTAnnotationsPlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { ExampleAnnotationsDriver } from './src/ExampleAnnotationsDriver.js';

// Protomaps "Light" theme — from protomaps/basemaps flavors.ts
const MVT_LAYERS = {
	earth: { fill: '#e2dfda', order: 0 },
	water: { fill: '#80deea', order: 1 },
	landcover: { fill: '#c4e7d2', order: 2 },
	landuse: { fill: '#cfddd5', order: 3 },
	natural: { fill: '#e2e0d7', order: 4 },
	buildings: { fill: '#cccccc', order: 5 },
	roads: { stroke: '#ebebeb', order: 6 },
	transit: { stroke: '#a7b1b3', order: 7 },
	boundaries: { stroke: '#adadad', order: 8 },
};

let controls, scene, renderer;
let tiles, camera, surfacePlugin;

const toLocalMat = new Matrix4();
const raycaster = new Raycaster();
const mouse = new Vector2();
const coordsEl = document.getElementById( 'coords' );

const params = {

	errorTarget: 1,
	planar: true,
	drape: true,
	projection: 'EPSG:8857',
	overlay: 'Protomaps',

};

init();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x111111 );
	renderer.setAnimationLoop( render );

	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// set up cameras and ortho / perspective transition
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 10000 );

	initTiles();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );

	// gui initialization
	const gui = new GUI();
	gui.add( params, 'planar' ).onChange( initTiles );
	gui.add( params, 'drape' ).onChange( initTiles );
	gui.add( params, 'projection', [ 'source', 'EPSG:4326', 'EPSG:8857' ] ).onChange( initTiles );
	gui.add( params, 'overlay', [ 'Protomaps', 'OpenStreetMap', 'Sentinel-2' ] ).onChange( initTiles );
	gui.add( params, 'errorTarget', 1, 40 ).onChange( () => {

		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );

	gui.open();

}

function initTiles() {

	if ( tiles ) {

		tiles.dispose();

	}

	if ( controls ) {

		controls.dispose();

	}

	let overlay;
	if ( params.overlay === 'Sentinel-2' ) {

		overlay = new CesiumIonOverlay( { assetId: 3954, apiToken: import.meta.env.VITE_ION_KEY } );

	} else if ( params.overlay === 'Protomaps' ) {

		// vector MVT data rendered to tile textures via the style callback. The source coop
		// link can be very slow so the data is loaded locally.
		// url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
		overlay = new PMTilesOverlay( {
			url: new URL( '../local-data/v4.pmtiles', import.meta.url ).toString(),
			getStyle: layerName => MVT_LAYERS[ layerName ] ?? null,
		} );

	} else {

		overlay = new XYZTilesOverlay( { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' } );

	}

	// tiles
	tiles = new TilesRenderer();
	// tiles.registerPlugin( new DebugTilesPlugin( { displayBoxBounds: true, displayParentBounds: true, colorMode: DebugTilesPlugin.ColorModes.RANDOM_COLOR, unlit: true }) );
	tiles.registerPlugin( new TilesFadePlugin( { maximumFadeOutTiles: 200 } ) );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	surfacePlugin = new GeneratedSurfacePlugin( {
		overlay,
		shape: params.planar ? 'planar' : 'ellipsoid',
		projection: params.projection === 'source' ? null : params.projection,
		applyOverlayTexture: ! params.drape,
	} );
	tiles.registerPlugin( surfacePlugin );

	if ( params.drape ) {

		// drape the overlay via the image overlay plugin so it maps through "tiles.surface"
		// rather than being applied to the generated tile textures directly
		tiles.registerPlugin( new ImageOverlayPlugin( { overlays: [ overlay ], resolution: 512 } ) );

	}

	if ( params.overlay === 'Protomaps' ) {

		// road and point annotations parsed from the same vector data
		const driver = new ExampleAnnotationsDriver();
		if ( params.planar ) {

			// the flattened plane has no elevation, so annotations settle directly onto the
			// surface without raycasting the tile geometry
			driver.sampleCartographicElevation = () => 0;

		}

		tiles.registerPlugin( new MVTAnnotationsPlugin( { overlay, camera, driver, resolution: 50 } ) );

	}

	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.parseQueue.maxJobs = 3;
	tiles.setCamera( camera );
	scene.add( tiles.group );
	window.TILES = tiles;

	if ( params.planar ) {

		// create the controls
		controls = new EnvironmentControls( scene, camera, renderer.domElement );
		controls.enableDamping = true;
		controls.minDistance = 1e-4;
		controls.maxDistance = 5;
		controls.cameraRadius = 0;
		controls.fallbackPlane.normal.set( 0, 0, 1 );
		controls.up.set( 0, 0, 1 );
		controls.camera.position.set( 0, 0, 2 );
		controls.camera.quaternion.identity();

		// reset the camera
		camera.near = 1e-4;
		camera.far = 10;
		camera.updateProjectionMatrix();

	} else {

		// init tiles
		tiles.group.rotation.x = - Math.PI / 2;

		// create the controls
		controls = new GlobeControls( scene, camera, renderer.domElement );
		controls.setEllipsoid( tiles.ellipsoid, tiles.group );
		controls.enableDamping = true;
		controls.camera.position.set( 0, 0, 1.75 * 1e7 );
		controls.camera.quaternion.identity();
		controls.minDistance = 150;

	}

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;
	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

	controls.update();
	camera.updateMatrixWorld();

	tiles.errorTarget = params.errorTarget;
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}

function onMouseMove( e ) {

	mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );
	const hits = raycaster.intersectObject( tiles.group, true );
	if ( hits.length > 0 ) {

		toLocalMat.copy( tiles.group.matrixWorld ).invert();
		hits[ 0 ].point.applyMatrix4( toLocalMat );

		const cart = surfacePlugin.getCartographicFromPosition( hits[ 0 ].point );
		const lat = MathUtils.radToDeg( cart.lat ).toFixed( 2 );
		const lon = MathUtils.radToDeg( cart.lon ).toFixed( 2 );
		coordsEl.textContent = `${ lat }°  ${ lon }°`;

	} else {

		coordsEl.textContent = '';

	}

}
