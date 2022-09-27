import { SphereHelper, EllipsoidRegionLineHelper, EllipsoidRegionHelper } from '../src/index.js';
import {
	Scene,
	Group,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	sRGBEncoding,
	MeshPhongMaterial,
	Box3Helper,
	Box3,
	Sphere,
	SphereBufferGeometry,
	Mesh,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer, group;
let dirLight;
let sphereHelper, boxHelper;
let helper, ghostHelper, edges, boxGroup;
const pointsArray = [];
let pointsGroup;

const params = {

	displaySphereHelper: false,
	displayBoxHelper: false,
	displayPoints: false,

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
	renderer.outputEncoding = sRGBEncoding;

	document.body.appendChild( renderer.domElement );

	// set up camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.position.set( 3, 1.5, 1 );

	// add the region group with rotation
	group = new Group();
	group.rotation.x = - Math.PI / 2;
	scene.add( group );

	pointsGroup = new Group();
	group.add( pointsGroup );

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
	sphereHelper = new SphereHelper( new Sphere() );

	// add box helper
	boxGroup = new Group();

	boxHelper = new Box3Helper( new Box3() );
	boxGroup.add( boxHelper );

	group.add( helper, ghostHelper, edges, sphereHelper, boxGroup );

	updateHelper();

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.15 );
	scene.add( ambLight );

	const gui = new GUI();
	gui.add( params, 'displayBoxHelper' );
	gui.add( params, 'displaySphereHelper' );
	gui.add( params, 'displayPoints' );

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
	helper.ellipsoidRegion.getBoundingSphere( sphereHelper.sphere );
	helper.ellipsoidRegion.getBoundingBox( boxHelper.box, boxGroup.matrix );
	boxGroup.matrix.decompose(
		boxGroup.position,
		boxGroup.quaternion,
		boxGroup.scale,
	);

	const points = helper.ellipsoidRegion._getPoints();
	pointsArray.forEach( o => o.visible = false );
	for ( let i = 0; i < points.length; i ++ ) {

		if ( ! pointsArray[ i ] ) {

			pointsArray.push( new Mesh( new SphereBufferGeometry( 0.01 ) ) );
			pointsArray[ i ].material.color.set( 0xff0000 );
			pointsGroup.add( pointsArray[ i ] );

		}

		pointsArray[ i ].position.copy( points[ i ] );
		pointsArray[ i ].visible = true;

	}

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

	sphereHelper.visible = params.displaySphereHelper;
	boxHelper.visible = params.displayBoxHelper;
	pointsGroup.visible = params.displayPoints;
	renderer.render( scene, camera );

}
