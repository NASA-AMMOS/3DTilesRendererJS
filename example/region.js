import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	sRGBEncoding,
	Mesh,
	SphereBufferGeometry,
	MeshBasicMaterial,
	Vector3,
	Group,
	Matrix4,
	Line,
	Sphere,
	PlaneHelper,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
	WGS84Region,
	WGS84RegionHelper,
	WGS84_MAJOR_RADIUS,
} from '../src/three/WGS84Region.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';

let camera, controls, scene, renderer, transformControls;
let region, regionHelper;
let infoEl;
let cameraSphere, gizmoSphere, gizmoGroup, gizmoLine, transformGroup;
let boundingSphereMesh, boundingSphereCenter;
let westPlaneHelper, eastPlaneHelper;
let needsUpdate = false;

const tempVec = new Vector3();
const tempMat = new Matrix4();
const sphere = new Sphere();

const params = {

	transformControls: true,
	boundingSphere: true,
	planeHelpers: true,
	north: 0.5,
	south: 0,
	east: 0.5,
	west: 0,
	minHeight: 0,
	maxHeight: 1,

};

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
	renderer.outputEncoding = sRGBEncoding;

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 40, 40, 40 );

	region = new WGS84Region(
		params.west,
		params.south,
		params.east,
		params.north,
		params.minHeight,
		params.maxHeight,
	);
	regionHelper = new WGS84RegionHelper( region );
	scene.add( regionHelper );

	westPlaneHelper = new PlaneHelper( region.westPlane, 10, 0xff0000 );
	eastPlaneHelper = new PlaneHelper( region.eastPlane, 10, 0x00ff00 );
	scene.add( westPlaneHelper, eastPlaneHelper );

	transformGroup = new Group();
	scene.add( transformGroup );

	boundingSphereMesh = new Mesh(
		new SphereBufferGeometry( 1, 50, 50 ),
		new MeshBasicMaterial( { color: 0xff0000, opacity: 0.15, transparent: true, depthWrite: false } ),
	);
	regionHelper.add( boundingSphereMesh );

	boundingSphereCenter = new Mesh(
		new SphereBufferGeometry( 1, 50, 50 ),
		new MeshBasicMaterial( { color: 0xff0000, opacity: 0.35, transparent: true, depthWrite: false } ),
	);
	boundingSphereCenter.scale.setScalar( 0.1 );
	regionHelper.add( boundingSphereCenter );
	window.boundingSphereCenter = boundingSphereCenter

	cameraSphere = new Mesh(
		new SphereBufferGeometry( 0.1 ),
		new MeshBasicMaterial( { color: 0xff0000 } ),
	);
	scene.add( cameraSphere );

	gizmoSphere = new Mesh(
		new SphereBufferGeometry( 0.1 ),
		new MeshBasicMaterial( { color: 0x00ff00 } ),
	);
	transformGroup.add( gizmoSphere );

	gizmoLine = new Line();
	gizmoLine.material.color.set( 0x00ff00 );
	transformGroup.add( gizmoLine );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	transformControls = new TransformControls( camera, renderer.domElement );
	gizmoGroup = new Group();
	transformGroup.add( gizmoGroup )
	transformGroup.add( transformControls );
	transformControls.attach( gizmoGroup );

	transformControls.addEventListener( 'mouseDown', () => controls.enabled = false );
	transformControls.addEventListener( 'mouseUp', () => controls.enabled = true );

	const gui = new GUI();
	gui.add( params, 'transformControls' ).onChange( v => {

		transformControls.enabled = v;
		transformGroup.visible = v;

	} );
	gui.add( params, 'boundingSphere' ).onChange( v => {

		boundingSphereMesh.visible = v;

	} );
	gui.add( params, 'planeHelpers' ).onChange( v => {

		westPlaneHelper.visible = v;
		eastPlaneHelper.visible = v;

	} );
	gui.add( params, 'north', - Math.PI, Math.PI, 0.01 ).onChange( onChange );
	gui.add( params, 'south', - Math.PI, Math.PI, 0.01 ).onChange( onChange );
	gui.add( params, 'east', - 2 * Math.PI, 2 * Math.PI, 0.01 ).onChange( onChange );
	gui.add( params, 'west', - 2 * Math.PI, 2 * Math.PI, 0.01 ).onChange( onChange );
	gui.add( params, 'minHeight', - 4, 4, 0.01 ).onChange( onChange );
	gui.add( params, 'maxHeight', - 4, 4, 0.01 ).onChange( onChange );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

}

function onChange() {

	needsUpdate = true;

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

}

function animate() {

	requestAnimationFrame( animate );

	if ( needsUpdate ) {

		region.set(
			params.west,
			params.south,
			params.east,
			params.north,
			params.minHeight,
			params.maxHeight,
		);
		regionHelper.update();

	}

	let cameraDistance, gizmoDistance;

	tempMat.copy( regionHelper.matrixWorld ).invert();
	tempVec.copy( camera.position ).applyMatrix4( tempMat );
	region.getClosestPointToPoint( camera.position, cameraSphere.position );
	cameraDistance = region.distanceToPoint( camera.position );
	cameraSphere.position.applyMatrix4( regionHelper.matrixWorld );

	tempVec.copy( gizmoGroup.position ).applyMatrix4( tempMat );
	region.getClosestPointToPoint( gizmoGroup.position, gizmoSphere.position );
	gizmoDistance = region.distanceToPoint( gizmoGroup.position );
	gizmoSphere.position.applyMatrix4( regionHelper.matrixWorld );

	gizmoLine.geometry.setFromPoints( [gizmoSphere.position, gizmoGroup.position ] );

	region.getBoundingSphere( sphere );
	boundingSphereCenter.position.copy( sphere.center );
	boundingSphereMesh.position.copy( sphere.center );
	boundingSphereMesh.scale.setScalar( sphere.radius );

	infoEl.innerText =
		`camera distance    : ${ cameraDistance.toFixed( 3 ) }\n` +
		`transform distance : ${ gizmoDistance.toFixed( 3 ) }`;

	render();

}

function render() {

	renderer.render( scene, camera );

}
