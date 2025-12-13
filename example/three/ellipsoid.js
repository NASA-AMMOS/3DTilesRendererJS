import { SphereHelper } from '../../src/three/plugins/objects/SphereHelper.js';
import { EllipsoidRegionHelper, EllipsoidRegionLineHelper } from '../../src/three/plugins/objects/EllipsoidRegionHelper.js';
import {
	Scene,
	Group,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	MeshPhongMaterial,
	Box3,
	Sphere,
	AxesHelper,
	Mesh,
	SphereGeometry,
	BoxGeometry,
	LineSegments,
	EdgesGeometry,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer, group;
let dirLight;
let helper, ghostHelper, edges, boxGroup, sphereGroup;

const params = {

	displaySphereHelper: false,
	displayBoxHelper: false,

};

init();
animate();

function init() {

	scene = new Scene();

	// set up renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	renderer.shadowMap.enabled = true;

	document.body.appendChild( renderer.domElement );

	// set up camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.position.set( 3, 1.5, 1 );

	// add the region group with rotation
	group = new Group();
	group.rotation.x = - Math.PI / 2;
	scene.add( group );

	// add ellipsoid helper
	helper = new EllipsoidRegionHelper();
	helper.material = new MeshPhongMaterial( {

		polygonOffset: true,
		polygonOffsetFactor: 1,
		polygonOffsetUnits: 1,

	} );
	helper.ellipsoidRegion.radius.z = 0.95;

	helper.ellipsoidRegion.heightStart = - 0.05;
	helper.ellipsoidRegion.heightEnd = 0.05;

	helper.ellipsoidRegion.latStart = 0;
	helper.ellipsoidRegion.latEnd = Math.PI / 4;

	helper.ellipsoidRegion.lonStart = 0;
	helper.ellipsoidRegion.lonEnd = Math.PI / 4;

	// add ghosted region
	ghostHelper = new EllipsoidRegionHelper();
	ghostHelper.material = new MeshPhongMaterial( { opacity: 0.1, transparent: true, depthWrite: false } );

	// add region edges
	edges = new EllipsoidRegionLineHelper( helper.ellipsoidRegion );
	edges.material.color.set( 0x151c1f ).convertSRGBToLinear();

	// add sphere helper
	const sphereHelper = new SphereHelper( new Sphere() );
	sphereHelper.sphere.center.set( 0, 0, 0 );
	sphereHelper.sphere.radius = 1;

	const sphereMesh = new Mesh( new SphereGeometry(), new MeshPhongMaterial( {
		transparent: true,
		depthWrite: false,
		opacity: 0.35,
		color: 0xffff00
	} ) );

	sphereGroup = new Group();
	sphereGroup.add( sphereMesh, sphereHelper );


	// add box helper
	const boxHelper = new LineSegments( new EdgesGeometry( new BoxGeometry() ) );
	boxHelper.material.color.set( 0xffff00 );
	// const boxHelper = new Box3Helper( new Box3() );


	const boxMesh = new Mesh( new BoxGeometry(), sphereMesh.material );
	boxGroup = new Group();
	boxGroup.add( boxHelper, boxMesh, new AxesHelper() );

	group.add( helper, ghostHelper, edges, boxGroup, sphereGroup );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 0;
	controls.maxDistance = 2000;

	updateHelper();

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.15 );
	scene.add( ambLight );

	const gui = new GUI();
	gui.add( params, 'displayBoxHelper' );
	gui.add( params, 'displaySphereHelper' );

	const radiusFolder = gui.addFolder( 'radius' );
	radiusFolder.add( helper.ellipsoidRegion.radius, 'x', 0.1, 2 ).onChange( updateHelper );
	radiusFolder.add( helper.ellipsoidRegion.radius, 'y', 0.1, 2 ).onChange( updateHelper );
	radiusFolder.add( helper.ellipsoidRegion.radius, 'z', 0.1, 2 ).onChange( updateHelper );

	const regionFolder = gui.addFolder( 'region' );
	regionFolder.add( helper.ellipsoidRegion, 'latStart', - Math.PI / 2, Math.PI / 2 ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'latEnd', - Math.PI / 2, Math.PI / 2 ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'lonStart', 0, 2 * Math.PI ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'lonEnd', 0, 2 * Math.PI ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'heightStart', - 0.25, 0.25 ).onChange( updateHelper );
	regionFolder.add( helper.ellipsoidRegion, 'heightEnd', - 0.25, 0.25 ).onChange( updateHelper );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

}

function updateHelper() {

	// update the ghost radius
	ghostHelper.ellipsoidRegion.radius.copy( helper.ellipsoidRegion.radius );

	// update geometry
	helper.update();
	ghostHelper.update();
	edges.update();

	// update the bounds helpers
	const sphere = new Sphere();
	helper.ellipsoidRegion.getBoundingSphere( sphere );
	sphereGroup.position.copy( sphere.center );
	sphereGroup.scale.setScalar( sphere.radius );

	const box = new Box3();
	helper.ellipsoidRegion.getBoundingBox( box, boxGroup.matrix );
	boxGroup.matrix.decompose(
		boxGroup.position,
		boxGroup.quaternion,
		boxGroup.scale,
	);
	box.getSize( boxGroup.scale );
	box.getCenter( boxGroup.position ).applyMatrix4( boxGroup.matrix );
	scene.updateMatrixWorld( true );

	controls.target.set( 0, 0, 0 ).applyMatrix4( boxGroup.matrixWorld );
	camera.position.add( controls.target );


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

	sphereGroup.visible = params.displaySphereHelper;

	boxGroup.visible = params.displayBoxHelper;

	renderer.render( scene, camera );

}
