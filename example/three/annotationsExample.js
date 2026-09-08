import {
	WGS84_ELLIPSOID,
	CAMERA_FRAME,
	GeoUtils,
	GlobeControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	GLTFExtensionsPlugin,
	CesiumIonAuthPlugin,
	PMTilesOverlay,
	MVTAnnotationsPlugin,
	MVTGlyphs,
	MVTIconGlyphs,
	UpdateOnChangePlugin,
	TerrariumMeshPlugin,
	XYZTilesOverlay,
} from '3d-tiles-renderer/plugins';
import { RasterElevationSamplingPlugin } from './src/plugins/RasterElevationSamplingPlugin.js';
import { ExampleAnnotationsDriver } from './src/ExampleAnnotationsDriver.js';
import { LoadRegionPlugin } from '3d-tiles-renderer/plugins';
import { CameraCartographicRegion } from './src/plugins/CameraCartographicRegion.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Raycaster,
	Vector2,
	Vector3,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshBVHPlugin } from './src/plugins/MeshBVHPlugin.js';

// localized name variants exposed by the protomaps v4 basemap
const LANGUAGES = [ 'default', 'en', 'ja', 'ko' ];

const params = {

	language: 'default',
	drawMode: MVTGlyphs.DrawMode.OVERLAY,
	displayIcons: true,
	displayPaths: true,
	horizonCutoff: 0.1,
	errorFalloff: 0,
	terrainRGB: false,

	occupancyGrid: false,
	pathVisualization: 'OFF',
	tileHierarchy: false,

};

let controls, scene, renderer, camera, tiles;
let driver = null;

// raycasting
const pointer = new Vector2();
const raycaster = new Raycaster();
const tooltip = document.getElementById( 'tooltip' );
const anchor = new Vector3();

const TOOLTIP_CARET_SIZE = 8;
const TOOLTIP_ANCHOR_GAP = 16;

init();
animate();

function initTiles() {

	if ( tiles ) {

		tiles.dispose();
		scene.remove( tiles.group );

	}

	// instantiate the tiles renderer
	tiles = new TilesRenderer();
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	if ( params.terrainRGB ) {

		// terrain generated from raster elevation tiles, textured with satellite imagery
		tiles.registerPlugin( new TerrariumMeshPlugin( {
			url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
			maxZoom: 15,
			unlit: true,
			overlay: new XYZTilesOverlay( {
				url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			} ),
			applyOverlayTexture: true,
		} ) );

	} else {

		tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
		tiles.registerPlugin( new GLTFExtensionsPlugin( {
			dracoLoader: new DRACOLoader(),
		} ) );
		tiles.registerPlugin( new MeshBVHPlugin() );

		// rasterized per-tile elevations for fast annotation settling queries
		tiles.registerPlugin( new RasterElevationSamplingPlugin( { renderer } ) );

	}

	tiles.registerPlugin( new TilesFadePlugin() );

	//

	// Create the overlay referencing the data to load for annotations
	// Note: The source coop link can be very slow to load so it's recommended to load the data locally
	// or host it on a faster server.
	const overlay = new PMTilesOverlay( {
		// url: new URL( '../local-data/v4.pmtiles', import.meta.url ).toString(),
		url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
	} );

	// create the driver for rendering labels, icons
	driver = new ExampleAnnotationsDriver();
	driver.language = params.language;
	driver.displayIcons = params.displayIcons;
	driver.displayPaths = params.displayPaths;
	driver.annotationPoints.drawMode = params.drawMode;
	driver.characterPoints.drawMode = params.drawMode;

	tiles.registerPlugin( new MVTAnnotationsPlugin( {
		overlay,
		camera,
		driver,
		horizonCutoff: params.horizonCutoff,
	} ) );

	//

	// use the camera cartographic region plugin to prevent particularly low-lod
	// tiles from loading beneath the camera, causing navigation issues.
	tiles.registerPlugin( new LoadRegionPlugin( {
		regions: [
			new CameraCartographicRegion( {
				camera,
				radius: 1500,
				errorTarget: 5000,
			} ),
		],
	} ) );

	//

	// initialize
	tiles.group.rotation.x = - Math.PI / 2;
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	// controls
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

	// debug displays
	const annotationsPlugin = tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' );
	annotationsPlugin.debug.occupancy.enabled = params.occupancyGrid;
	annotationsPlugin.debug.hierarchy.enabled = params.tileHierarchy;
	applyPathVisualization();

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;
	controls.enableFlight = true;
	controls.flightSpeed = 0.25;
	controls.maxAltitude = Math.PI / 2;

	initTiles();

	// Zaragoza, Spain
	tiles.group.updateMatrixWorld();
	WGS84_ELLIPSOID.getObjectFrame(
		41.6275 * Math.PI / 180, - 0.8858 * Math.PI / 180, 2000,
		0, - Math.PI / 4, 0,
		camera.matrixWorld, CAMERA_FRAME,
	);
	camera.matrixWorld.premultiply( tiles.group.matrixWorld );
	camera.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale );

	// resize
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize );
	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	controls.addEventListener( 'change', updateTooltip );

	// GUI
	const gui = new GUI();
	gui.add( params, 'language', LANGUAGES ).onChange( v => {

		driver.language = v;
		driver.needsUpdate = true;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'drawMode', MVTIconGlyphs.DrawMode ).onChange( v => {

		driver.annotationPoints.drawMode = v;
		driver.characterPoints.drawMode = v;

	} );
	gui.add( params, 'displayIcons' ).onChange( v => {

		driver.displayIcons = v;
		driver.needsUpdate = true;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'displayPaths' ).onChange( v => {

		driver.displayPaths = v;
		driver.needsUpdate = true;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'horizonCutoff', 0, 0.75, 0.01 ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).horizonCutoff = v;

	} );
	gui.add( params, 'errorFalloff', 0, 50 ).onChange( v => {

		tiles.errorFalloff = v;
		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );
	gui.add( params, 'terrainRGB' ).onChange( initTiles );

	const debugFolder = gui.addFolder( 'Debug' );
	debugFolder.add( params, 'occupancyGrid' ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).debug.occupancy.enabled = v;

	} );
	debugFolder.add( params, 'pathVisualization', [ 'OFF', 'NONE', 'ID', 'LEVEL', 'TILE', 'NAME', 'REJECTION' ] ).onChange( applyPathVisualization );
	debugFolder.add( params, 'tileHierarchy' ).onChange( v => {

		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).debug.hierarchy.enabled = v;

	} );

}

// apply the selected path debug display: hidden entirely or one of the overlay color modes
function applyPathVisualization() {

	const paths = tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' ).debug.paths;
	paths.enabled = params.pathVisualization !== 'OFF';
	paths.colorMode = paths.ColorMode[ params.pathVisualization ] ?? paths.ColorMode.NONE;

}

function onPointerMove( e ) {

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ( ( e.clientX - rect.left ) / rect.width ) * 2 - 1;
	pointer.y = - ( ( e.clientY - rect.top ) / rect.height ) * 2 + 1;

	updateTooltip();

}

function updateTooltip() {

	raycaster.setFromCamera( pointer, camera );

	const hits = raycaster.intersectObject( driver.annotationPoints );
	const properties = hits[ 0 ]?.properties;
	if ( ! properties ) {

		tooltip.style.display = 'none';
		return;

	}

	// anchor to the annotation itself rather than the cursor so the caret stays on the icon
	const rect = renderer.domElement.getBoundingClientRect();
	anchor.copy( hits[ 0 ].point ).project( camera );
	const anchorX = rect.left + ( anchor.x * 0.5 + 0.5 ) * rect.width;
	const anchorY = rect.top + ( - anchor.y * 0.5 + 0.5 ) * rect.height;

	// get the name based on the properties and language
	let name;
	if ( params.language === 'default' ) {

		name = properties.name;

	} else {

		name = properties[ `name:${ params.language }` ] || properties.name;

	}

	const kind = properties.kind?.replace( /_/g, ' ' ) ?? '';

	// show the kind as a subtitle under the name, or on its own when the feature has no name
	tooltip.innerHTML = '';
	if ( name ) {

		tooltip.appendChild( document.createTextNode( name ) );

	}

	if ( kind ) {

		const kindEl = document.createElement( 'span' );
		kindEl.className = 'kind';
		kindEl.textContent = kind;
		tooltip.appendChild( kindEl );

	}

	tooltip.style.display = 'block';

	// sit above the annotation, clamped into the window, and offset the caret by however much the
	// clamp shifted the panel so it keeps pointing at the icon
	const x = Math.min( Math.max( anchorX - tooltip.offsetWidth / 2, 4 ), window.innerWidth - tooltip.offsetWidth - 4 );
	const y = Math.max( anchorY - tooltip.offsetHeight - TOOLTIP_CARET_SIZE - TOOLTIP_ANCHOR_GAP, 4 );
	tooltip.style.left = x + 'px';
	tooltip.style.top = y + 'px';
	tooltip.style.setProperty( '--caret-x', `${ anchorX - x }px` );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) {

		return;

	}

	// controls update
	controls.update();

	// tiles update
	camera.updateMatrixWorld();
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );
	tiles.update();

	renderer.render( scene, camera );

	// credits
	const mat = tiles.group.matrixWorldInverse;
	const vec = camera.position.clone().applyMatrix4( mat );
	const res = {};
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );

	const attributions = tiles.getAttributions()[ 0 ]?.value || '';
	document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + attributions;

}
