import {
	WGS84_ELLIPSOID,
	GeoUtils,
	GlobeControls,
	CameraTransitionManager,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	UpdateOnChangePlugin,
	TileCompressionPlugin,
	UnloadTilesPlugin,
	GLTFExtensionsPlugin,
	CesiumIonAuthPlugin,
	ImageOverlayPlugin,
	PMTilesOverlay,
} from '3d-tiles-renderer/plugins';
import { MVTAnnotationsPlugin } from '../../src/three/plugins/mvt/MVTAnnotationsPlugin.js';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	OrthographicCamera,
	Raycaster,
	Vector2,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let controls, scene, renderer, tiles, transition;

const pointer = new Vector2();
const raycaster = new Raycaster();
const tooltip = document.getElementById( 'tooltip' );
let lastClientX = 0, lastClientY = 0;

const params = {

	orthographic: false,
	errorTarget: 20,

};

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } ) );
	tiles.registerPlugin( new TileCompressionPlugin() );
	tiles.registerPlugin( new UpdateOnChangePlugin() );
	tiles.registerPlugin( new UnloadTilesPlugin() );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader().setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' )
	} ) );
	tiles.registerPlugin( new TilesFadePlugin() );

	const overlay = new PMTilesOverlay( {
		url: 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles',
	} );

	tiles.registerPlugin( new ImageOverlayPlugin( { overlays: [ overlay ], renderer } ) );
	tiles.registerPlugin( new MVTAnnotationsPlugin( {
		overlay,
		camera: transition.camera,
		scene,
	} ) );

	tiles.group.rotation.x = - Math.PI / 2;
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( transition.camera, renderer );
	tiles.setCamera( transition.camera );

	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

}

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera and transition
	transition = new CameraTransitionManager(
		new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 ),
		new OrthographicCamera( - 1, 1, 1, - 1, 1, 160000000 ),
	);
	transition.perspectiveCamera.position.set( 4800000, 2570000, 14720000 );
	transition.perspectiveCamera.lookAt( 0, 0, 0 );
	transition.autoSync = false;

	transition.addEventListener( 'camera-change', ( { camera, prevCamera } ) => {

		tiles.deleteCamera( prevCamera );
		tiles.setCamera( camera );
		controls.setCamera( camera );
		tiles.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' )?.setCamera( camera );

	} );

	transition.orthographicPositionalZoom = false;

	// controls
	controls = new GlobeControls( scene, transition.camera, renderer.domElement, null );
	controls.enableDamping = true;
	controls.enableFlight = true;
	controls.flightSpeed = 0.5;
	controls.maxAltitude = Math.PI / 2;

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize );
	renderer.domElement.addEventListener( 'pointermove', onPointerMove );
	controls.addEventListener( 'change', updateTooltip );

	// GUI
	const gui = new GUI();
	gui.width = 260;

	gui.add( params, 'orthographic' ).onChange( v => {

		controls.getPivotPoint( transition.fixedPoint );

		if ( ! transition.animating ) {

			transition.syncCameras();
			controls.adjustCamera( transition.perspectiveCamera );
			controls.adjustCamera( transition.orthographicCamera );

		}

		transition.toggle();

	} );

	gui.add( params, 'errorTarget', 5, 100, 1 ).onChange( () => {

		tiles.getPluginByName( 'UPDATE_ON_CHANGE_PLUGIN' ).needsUpdate = true;

	} );

}

function onPointerMove( e ) {

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ( ( e.clientX - rect.left ) / rect.width ) * 2 - 1;
	pointer.y = - ( ( e.clientY - rect.top ) / rect.height ) * 2 + 1;
	lastClientX = e.clientX;
	lastClientY = e.clientY;

	updateTooltip();

}

function updateTooltip() {

	const plugin = tiles?.getPluginByName( 'MVT_ANNOTATIONS_PLUGIN' );
	const points = plugin?._annotationsPoints;
	if ( ! points ) return;

	raycaster.setFromCamera( pointer, transition.camera );
	const hits = raycaster.intersectObject( points );

	if ( hits.length > 0 ) {

		const { properties } = hits[ 0 ];
		if ( properties && properties.name ) {

			tooltip.textContent = properties.name;
			tooltip.style.display = 'block';
			const x = Math.min( Math.max( lastClientX - tooltip.offsetWidth / 2, 4 ), window.innerWidth - tooltip.offsetWidth - 4 );
			const y = Math.max( lastClientY - tooltip.offsetHeight - 10, 4 );
			tooltip.style.left = x + 'px';
			tooltip.style.top = y + 'px';

		}

	} else {

		tooltip.style.display = 'none';

	}

}

function onWindowResize() {

	const { perspectiveCamera, orthographicCamera } = transition;
	const aspect = window.innerWidth / window.innerHeight;

	perspectiveCamera.aspect = aspect;
	perspectiveCamera.updateProjectionMatrix();

	orthographicCamera.left = - orthographicCamera.top * aspect;
	orthographicCamera.right = - orthographicCamera.left;
	orthographicCamera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	scene.updateMatrixWorld();

	controls.enabled = ! transition.animating;
	controls.update();
	transition.update();

	const camera = transition.camera;
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	camera.updateMatrixWorld();
	tiles.errorTarget = params.errorTarget;
	tiles.update();

	renderer.render( scene, camera );

	// credits
	const mat = tiles.group.matrixWorld.clone().invert();
	const vec = transition.camera.position.clone().applyMatrix4( mat );
	const res = {};
	WGS84_ELLIPSOID.getPositionToCartographic( vec, res );

	const attributions = tiles.getAttributions()[ 0 ]?.value || '';
	document.getElementById( 'credits' ).innerText = GeoUtils.toLatLonString( res.lat, res.lon ) + '\n' + attributions;

}
