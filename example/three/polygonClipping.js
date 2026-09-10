import { EnvironmentControls, TilesRenderer } from '3d-tiles-renderer';
import { PolygonClippingPlugin } from '3d-tiles-renderer/plugins';
import {
	AmbientLight,
	BufferGeometry,
	DirectionalLight,
	Group,
	LineBasicMaterial,
	LineLoop,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const CLIPPING_POLYGONS = [
	[
		[[ - 16, - 10 ], [ 16, - 10 ], [ 16, 12 ], [ 5, 12 ], [ 5, 2 ], [ - 3, 2 ], [ - 3, 12 ], [ - 16, 12 ]],
		[[ - 5, - 7 ], [ - 5, - 3 ], [ 5, - 3 ], [ 5, - 7 ]],
	],
	[
		[[ - 5, - 24 ], [ 5, - 24 ], [ 5, - 19 ], [ - 5, - 19 ]],
	],
];

let camera, controls, scene, renderer, tiles;
let clippingPlugin, clippingHelper;

const params = {

	enabled: true,
	inverse: false,
	padding: 0,
	displayMask: true,

};

init();
render();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xd8cec0 );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 20, 10, 20 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.minZoomDistance = 2;
	controls.cameraRadius = 1;
	controls.enableDamping = true;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	const tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.errorTarget = 6;
	tilesParent.add( tiles.group );
	tilesParent.updateMatrixWorld( true );

	clippingPlugin = new PolygonClippingPlugin( {
		polygons: CLIPPING_POLYGONS,
		frame: tiles.group.matrixWorld,
		inverse: params.inverse,
		resolution: 512,
	} );
	tiles.registerPlugin( clippingPlugin );

	// clipping helper
	clippingHelper = createClippingHelper( CLIPPING_POLYGONS );
	clippingHelper.matrix.copy( clippingPlugin.frame );
	clippingHelper.matrixAutoUpdate = false;
	scene.add( clippingHelper );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.add( params, 'enabled' ).onChange( value => {

		clippingPlugin.enabled = value;

	} );
	gui.add( params, 'inverse' ).onChange( value => {

		clippingPlugin.inverse = value;

	} );
	gui.add( params, 'padding', 0, 5, 0.1 ).onFinishChange( value => {

		clippingPlugin.padding = value;
		clippingPlugin.setPolygons( CLIPPING_POLYGONS );

	} );
	gui.add( params, 'displayMask' ).onChange( value => {

		clippingHelper.visible = value;

	} );
	gui.open();

}

function createClippingHelper( polygons ) {

	const result = new Group();
	polygons.forEach( polygon => {

		polygon.forEach( ( ring, index ) => {

			const points = ring.map( point => new Vector3( point[ 0 ], point[ 1 ], - 0.5 ) );
			const geometry = new BufferGeometry().setFromPoints( points );
			const material = new LineBasicMaterial( {
				color: index === 0 ? 0xff5533 : 0x44aaff,
				depthTest: false,
				transparent: true,
				opacity: 0.9,
			} );
			const line = new LineLoop( geometry, material );
			line.renderOrder = 1;
			result.add( line );

		} );

	} );
	return result;

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function render() {

	requestAnimationFrame( render );

	controls.update();
	camera.updateMatrixWorld();

	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
