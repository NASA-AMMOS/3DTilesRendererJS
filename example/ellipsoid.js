import { Ellipsoid, EllipsoidRegion, EllipsoidHelper } from '../src/index.js';
import {
	Scene,
	Group,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	sRGBEncoding,
	PCFSoftShadowMap,
	Vector2,
	Raycaster,
	ShaderLib,
	UniformsUtils,
	ShaderMaterial,
	Color,
	MeshPhongMaterial,
	DoubleSide,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer, offsetGroup;
let dirLight;
let raycaster, mouse;
let model;
let infoEl;
let helper, ghostHelper;

init();
animate();

function init() {

	infoEl = document.getElementById( 'info' );

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
	camera.position.set( 3, 3, 3 );

	const group = new Group();
	group.rotation.x = Math.PI / 2;
	scene.add( group );

	helper = new EllipsoidHelper();
	helper.material = new MeshPhongMaterial( { side: DoubleSide } );

	ghostHelper = new EllipsoidHelper();
	ghostHelper.material = new MeshPhongMaterial( { side: DoubleSide, opacity: 0.1, transparent: true } );

	group.add( helper, ghostHelper );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.05 );
	scene.add( ambLight );

	const gui = new GUI();
	const radiusFolder = gui.addFolder( 'radius' );
	radiusFolder.add( helper.ellipsoidRegion.radius, 'x', 0.1, 2 ).onChange( updateHelper );
	radiusFolder.add( helper.ellipsoidRegion.radius, 'y', 0.1, 2 ).onChange( updateHelper );
	radiusFolder.add( helper.ellipsoidRegion.radius, 'z', 0.1, 2 ).onChange( updateHelper );

	const regionFolder = gui.addFolder( 'region' );
	regionFolder.add( helper.ellipsoidRegion, 'latStart', - Math.PI / 2, Math.PI / 2 ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'latEnd', - Math.PI / 2, Math.PI / 2 ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'lonStart', 0, 2 * Math.PI ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'lonEnd', 0, 2 * Math.PI ).onChange( updateHelper );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

}

function updateHelper() {

	ghostHelper.ellipsoidRegion.radius.copy( helper.ellipsoidRegion.radius );

	helper.update();
	ghostHelper.update();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

}

function animate() {

	requestAnimationFrame( animate );

	render();

}

function render() {

	renderer.render( scene, camera );

}
