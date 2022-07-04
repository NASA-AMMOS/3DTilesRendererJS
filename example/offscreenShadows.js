import { TilesRenderer } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	OrthographicCamera,
	sRGBEncoding,
	Group,
	MeshStandardMaterial,
	PCFSoftShadowMap,
	Sphere,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let camera, controls, scene, renderer, tiles, orthoCamera;
let offsetParent, box, sphere, dirLight;
let stats;

const NONE = 0;
const DISPLAY_ACTIVE_TILES = 1;
const USE_SHADOW_CAMERA = 2;
const params = {

	'errorTarget': 2,
	'shadowStrategy': NONE,
	'orthographic': false,

};

init();
animate();

function onLoadModel( scene ) {

	scene.traverse( c => {

		if ( c.isMesh ) {

			c.material = new MeshStandardMaterial();
			c.castShadow = true;
			c.receiveShadow = true;

		}

	} );

}

function onDisposeModel( scene ) {

	scene.traverse( c => {

		if ( c.isMesh ) {

			c.material.dispose();

		}

	} );

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFSoftShadowMap;
	renderer.outputEncoding = sRGBEncoding;

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( - 56, 232, 260 );

	orthoCamera = new OrthographicCamera();

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( - 100, 40, 10 );
	dirLight.castShadow = true;
	dirLight.shadow.bias = - 1e-4;
	dirLight.shadow.normalBias = 0.2;
	dirLight.shadow.mapSize.setScalar( 2048 );

	const shadowCam = dirLight.shadow.camera;
	shadowCam.left = - 120;
	shadowCam.bottom = - 120;
	shadowCam.right = 120;
	shadowCam.top = 120;
	shadowCam.updateProjectionMatrix();

	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.05 );
	scene.add( ambLight );

	box = new Box3();
	sphere = new Sphere();

	offsetParent = new Group();
	scene.add( offsetParent );

	// tiles
	const url = window.location.hash.replace( /^#/, '' ) || '../data/tileset.json';
	tiles = new TilesRenderer( url );
	tiles.onLoadModel = onLoadModel;
	tiles.onDisposeModel = onDisposeModel;
	offsetParent.add( tiles.group );


	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'orthographic' );
	gui.add( params, 'errorTarget' ).min( 0 ).max( 25 ).step( 1 );
	gui.add( params, 'shadowStrategy', { NONE, DISPLAY_ACTIVE_TILES, USE_SHADOW_CAMERA } );
	gui.open();

	// Stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

	updateOrthoCamera();

}

function updateOrthoCamera() {

	orthoCamera.position.copy( camera.position );
	orthoCamera.rotation.copy( camera.rotation );

	const scale = camera.position.distanceTo( controls.target ) / 2.0;
	const aspect = window.innerWidth / window.innerHeight;
	orthoCamera.left = - aspect * scale;
	orthoCamera.right = aspect * scale;
	orthoCamera.bottom = - scale;
	orthoCamera.top = scale;
	orthoCamera.near = camera.near;
	orthoCamera.far = camera.far;
	orthoCamera.updateProjectionMatrix();

}

function animate() {

	requestAnimationFrame( animate );

	tiles.errorTarget = params.errorTarget;
	switch ( parseFloat( params.shadowStrategy ) ) {

		case NONE:
			tiles.displayActiveTiles = false;
			tiles.autoDisableRendererCulling = true;
			tiles.deleteCamera( dirLight.shadow.camera );
			break;

		case DISPLAY_ACTIVE_TILES:
			tiles.displayActiveTiles = true;
			tiles.autoDisableRendererCulling = false;
			tiles.deleteCamera( dirLight.shadow.camera );
			break;

		case USE_SHADOW_CAMERA:
			tiles.displayActiveTiles = false;
			tiles.autoDisableRendererCulling = false;
			tiles.setCamera( dirLight.shadow.camera );
			tiles.setResolution( dirLight.shadow.camera, dirLight.shadow.mapSize );
			break;

	}

	if ( params.orthographic ) {

		tiles.deleteCamera( camera );
		tiles.setCamera( orthoCamera );
		tiles.setResolutionFromRenderer( orthoCamera, renderer );

	} else {

		tiles.deleteCamera( orthoCamera );
		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );

	}

	offsetParent.rotation.set( 0, 0, 0 );
	if ( params.up === '-Z' ) {

		offsetParent.rotation.x = Math.PI / 2;

	}
	offsetParent.updateMatrixWorld( true );

	// update tiles center
	if ( tiles.getBounds( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	} else if ( tiles.getBoundingSphere( sphere ) ) {

		tiles.group.position.copy( sphere.center );
		tiles.group.position.multiplyScalar( - 1 );

	}

	// update tiles
	window.tiles = tiles;
	camera.updateMatrixWorld();
	orthoCamera.updateMatrixWorld();
	tiles.update();

	render();
	stats.update();

}

function render() {

	updateOrthoCamera();

	renderer.render( scene, params.orthographic ? orthoCamera : camera );

}
