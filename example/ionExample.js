import {
	DebugTilesRenderer as TilesRenderer,
	DebugCesiumIonTilesRenderer as CesiumIonTilesRenderer,
	NONE,
	SCREEN_ERROR,
	GEOMETRIC_ERROR,
	DISTANCE,
	DEPTH,
	RELATIVE_DEPTH,
	IS_LEAF,
	RANDOM_COLOR,
} from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	CameraHelper,
	Raycaster,
	Vector2,
	Vector3,
	Quaternion,
	Mesh,
	CylinderGeometry,
	MeshBasicMaterial,
	Group,
	TorusGeometry,
	OrthographicCamera,
	Matrix4,
	Box3,
	Sphere,
} from 'three';
import { FlyOrbitControls } from './FlyOrbitControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const ALL_HITS = 1;
const FIRST_HIT_ONLY = 2;

const hashUrl = window.location.hash.replace( /^#/, '' );
let camera, controls, scene, renderer, tiles, cameraHelper;
let thirdPersonCamera, thirdPersonRenderer, thirdPersonControls;
let secondRenderer, secondCameraHelper, secondControls, secondCamera;
let orthoCamera, orthoCameraHelper;
let raycaster, mouse, rayIntersect, lastHoveredElement;
let offsetParent;
let statsContainer, stats;

const params = {

	'enableUpdate': true,
	'raycast': NONE,
	'enableCacheDisplay': false,
	'enableRendererStats': false,
	'orthographic': false,

	'ionAssetId': '40866',
	'ionAccessToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYmE2YWEzOS1lZDUyLTQ0YWMtOTlkNS0wN2VhZWI3NTc4MmEiLCJpZCI6MjU5LCJpYXQiOjE2ODU2MzQ0Njl9.AswCMxsN03WYwuZL-r183OZicN64Ks9aPExWhA3fuLY',
	'errorTarget': 6,
	'errorThreshold': 60,
	'maxDepth': 15,
	'loadSiblings': true,
	'stopAtEmptyTiles': true,
	'displayActiveTiles': false,
	'resolutionScale': 1.0,

	'up': '+Y',
	'displayBoxBounds': false,
	'colorMode': 0,
	'showThirdPerson': false,
	'showSecondView': false,
	'reload': reinstantiateTiles,

};

init();
animate();

function rotationBetweenDirections( dir1, dir2 ) {

	const rotation = new Quaternion();
	const a = new Vector3().crossVectors( dir1, dir2 );
	rotation.x = a.x;
	rotation.y = a.y;
	rotation.z = a.z;
	rotation.w = 1 + dir1.clone().dot( dir2 );
	rotation.normalize();

	return rotation;

}

function setupTiles() {

	tiles.fetchOptions.mode = 'cors';

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );

	tiles.manager.addHandler( /\.gltf$/, loader );
	offsetParent.add( tiles.group );

}

function isInt( input ) {

	return ( typeof input === 'string' ) ? ! isNaN( input ) && ! isNaN( parseFloat( input ) ) && Number.isInteger( parseFloat( input ) ) : Number.isInteger( input );

}

function reinstantiateTiles() {

	if ( tiles ) {

		offsetParent.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new CesiumIonTilesRenderer( params.ionAssetId, params.ionAccessToken );
	tiles.onLoadTileSet = () => {

		const box = new Box3();
		const sphere = new Sphere();
		const matrix = new Matrix4();

		let position;
		let distanceToEllipsoidCenter;

		if ( tiles.getOrientedBounds( box, matrix ) ) {

			position = new Vector3().setFromMatrixPosition( matrix );
			distanceToEllipsoidCenter = position.length();

		} else if ( tiles.getBoundingSphere( sphere ) ) {

			position = sphere.center.clone();
			distanceToEllipsoidCenter = position.length();

		}

		const surfaceDirection = position.normalize();
		const up = new Vector3( 0, 1, 0 );
		const rotationToNorthPole = rotationBetweenDirections( surfaceDirection, up );

		tiles.group.quaternion.x = rotationToNorthPole.x;
		tiles.group.quaternion.y = rotationToNorthPole.y;
		tiles.group.quaternion.z = rotationToNorthPole.z;
		tiles.group.quaternion.w = rotationToNorthPole.w;

		tiles.group.position.y = - distanceToEllipsoidCenter;

	};

	setupTiles();

}

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 400, 400, 400 );
	cameraHelper = new CameraHelper( camera );
	scene.add( cameraHelper );

	// controls
	controls = new FlyOrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	offsetParent = new Group();
	scene.add( offsetParent );

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const ionOptions = gui.addFolder( 'Ion' );
	ionOptions.add( params, 'ionAssetId' );
	ionOptions.add( params, 'ionAccessToken' );
	ionOptions.add( params, 'reload' );
	ionOptions.open();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio * params.resolutionScale );

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );

	// update tiles
	window.tiles = tiles;
	camera.updateMatrixWorld();
	tiles.update();

	renderer.render( scene, camera );

}
