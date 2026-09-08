import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	Vector2,
	Matrix4,
	MathUtils,
	AmbientLight,
	DirectionalLight,
} from 'three';
import { TilesRenderer, GlobeControls, EnvironmentControls } from '3d-tiles-renderer';
import { TilesFadePlugin, UpdateOnChangePlugin, TerrainRGBMeshPlugin, PMTilesOverlay, MVTAnnotationsPlugin } from '3d-tiles-renderer/plugins';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { ExampleAnnotationsDriver } from './src/ExampleAnnotationsDriver.js';

// Protomaps "Light" theme from protomaps/basemaps flavors.ts
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

const EARTH_RADIUS = 6378137;

// display projection options by name
const PROJECTIONS = {
	'ellipsoid': 'ellipsoid',
	'mercator': 'EPSG:3857',
	'equirect': 'EPSG:4326',
	'equal earth': 'EPSG:8857',
};

// meters-to-world factor for the planar shape, derived from the display projection on load
let planarHeightScale = 1;

const params = {

	errorTarget: 1,
	heightScale: 1,
	projection: 'equal earth',

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

	// lights for the displaced terrain material
	const ambientLight = new AmbientLight( 0xffffff, 1.0 );
	scene.add( ambientLight );

	const directionalLight = new DirectionalLight( 0xffffff, 2.5 );
	directionalLight.position.set( 1, 2, 3 );
	scene.add( directionalLight );

	// set up cameras and ortho / perspective transition
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.0001, 10000 );

	initTiles();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );

	// gui initialization
	const gui = new GUI();
	gui.add( params, 'projection', Object.keys( PROJECTIONS ) ).onChange( initTiles );
	gui.add( params, 'heightScale', 0, 10 ).onChange( v => {

		surfacePlugin.heightScale = params.projection !== 'ellipsoid' ? v * planarHeightScale : v;

	} );
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

	const planar = params.projection !== 'ellipsoid';

	// vector MVT data rendered to tile textures via the style callback
	const overlay = new PMTilesOverlay( {
		url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
		getStyle: layerName => MVT_LAYERS[ layerName ] ?? null,
	} );

	// tiles
	tiles = new TilesRenderer();
	tiles.registerPlugin( new TilesFadePlugin( { maximumFadeOutTiles: 200 } ) );
	tiles.registerPlugin( new UpdateOnChangePlugin() );

	// terrain tiles displaced by Terrain-RGB elevation data, with the overlay applied to the
	// lit tile materials directly for a hill-shaded look
	surfacePlugin = new TerrainRGBMeshPlugin( {
		url: 'https://terrain.reearth.land/mapterhorn-egm08/mapbox/elevation/{z}/{x}/{y}.png',
		tileDimension: 512,
		maxZoom: 14,
		projection: PROJECTIONS[ params.projection ],
		overlay,
		applyOverlayTexture: true,
	} );

	if ( planar ) {

		// scale the meter elevations into the planar world, where one unit spans the height
		// of the projected map
		tiles.addEventListener( 'load-root-tileset', () => {

			const [ , extentY ] = tiles.surface.projection.getProjectedExtents();
			planarHeightScale = 1 / ( extentY * EARTH_RADIUS );
			surfacePlugin.heightScale = params.heightScale * planarHeightScale;

		} );

	} else {

		surfacePlugin.heightScale = params.heightScale;

	}

	tiles.registerPlugin( surfacePlugin );

	// road and point annotations parsed from the same vector data
	const driver = new ExampleAnnotationsDriver();
	tiles.registerPlugin( new MVTAnnotationsPlugin( { overlay, camera, driver, resolution: 100 } ) );

	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.parseQueue.maxJobs = 6;
	tiles.downloadQueue.maxJobsPerOrigin = 40;
	tiles.setCamera( camera );
	scene.add( tiles.group );

	if ( planar ) {

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

		const cart = tiles.surface.getPositionToCartographic( hits[ 0 ].point, {} );
		const lat = MathUtils.radToDeg( cart.lat ).toFixed( 2 );
		const lon = MathUtils.radToDeg( cart.lon ).toFixed( 2 );
		coordsEl.textContent = `${ lat }°  ${ lon }°`;

	} else {

		coordsEl.textContent = '';

	}

}
