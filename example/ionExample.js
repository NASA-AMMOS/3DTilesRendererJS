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

	const url = hashUrl || '../data/tileset.json';

	if ( hashUrl ) {

		params.ionAssetId = isInt( hashUrl ) ? hashUrl : '';

	}

	if ( tiles ) {

		offsetParent.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	if ( params.ionAssetId ) {

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

	} else {

		tiles = new TilesRenderer( url );

	}

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

	orthoCamera = new OrthographicCamera();
	orthoCameraHelper = new CameraHelper( orthoCamera );
	scene.add( orthoCameraHelper );

	// secondary camera view
	secondCamera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	secondCamera.position.set( 400, 400, - 400 );
	secondCamera.lookAt( 0, 0, 0 );

	secondRenderer = new WebGLRenderer( { antialias: true } );
	secondRenderer.setPixelRatio( window.devicePixelRatio );
	secondRenderer.setSize( window.innerWidth, window.innerHeight );
	secondRenderer.setClearColor( 0x151c1f );

	document.body.appendChild( secondRenderer.domElement );
	secondRenderer.domElement.style.position = 'absolute';
	secondRenderer.domElement.style.right = '0';
	secondRenderer.domElement.style.top = '0';
	secondRenderer.domElement.style.outline = '#0f1416 solid 2px';
	secondRenderer.domElement.tabIndex = 1;

	secondControls = new FlyOrbitControls( secondCamera, secondRenderer.domElement );
	secondControls.screenSpacePanning = false;
	secondControls.minDistance = 1;
	secondControls.maxDistance = 2000;

	secondCameraHelper = new CameraHelper( secondCamera );
	scene.add( secondCameraHelper );

	// Third person camera view
	thirdPersonCamera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	thirdPersonCamera.position.set( 50, 40, 40 );
	thirdPersonCamera.lookAt( 0, 0, 0 );

	thirdPersonRenderer = new WebGLRenderer( { antialias: true } );
	thirdPersonRenderer.setPixelRatio( window.devicePixelRatio );
	thirdPersonRenderer.setSize( window.innerWidth, window.innerHeight );
	thirdPersonRenderer.setClearColor( 0x0f1416 );

	document.body.appendChild( thirdPersonRenderer.domElement );
	thirdPersonRenderer.domElement.style.position = 'fixed';
	thirdPersonRenderer.domElement.style.left = '5px';
	thirdPersonRenderer.domElement.style.bottom = '5px';
	thirdPersonRenderer.domElement.tabIndex = 1;

	thirdPersonControls = new FlyOrbitControls( thirdPersonCamera, thirdPersonRenderer.domElement );
	thirdPersonControls.screenSpacePanning = false;
	thirdPersonControls.minDistance = 1;
	thirdPersonControls.maxDistance = 2000;

	// controls
	controls = new FlyOrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	offsetParent = new Group();
	scene.add( offsetParent );

	// Raycasting init
	raycaster = new Raycaster();
	mouse = new Vector2();

	rayIntersect = new Group();

	const rayIntersectMat = new MeshBasicMaterial( { color: 0xe91e63 } );
	const rayMesh = new Mesh( new CylinderGeometry( 0.25, 0.25, 6 ), rayIntersectMat );
	rayMesh.rotation.x = Math.PI / 2;
	rayMesh.position.z += 3;
	rayIntersect.add( rayMesh );

	const rayRing = new Mesh( new TorusGeometry( 1.5, 0.2, 16, 100 ), rayIntersectMat );
	rayIntersect.add( rayRing );
	scene.add( rayIntersect );
	rayIntersect.visible = false;

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

	thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
	thirdPersonCamera.updateProjectionMatrix();
	thirdPersonRenderer.setSize( Math.floor( window.innerWidth / 3 ), Math.floor( window.innerHeight / 3 ) );

	if ( params.showSecondView ) {

		camera.aspect = 0.5 * window.innerWidth / window.innerHeight;
		renderer.setSize( 0.5 * window.innerWidth, window.innerHeight );

		secondCamera.aspect = 0.5 * window.innerWidth / window.innerHeight;
		secondRenderer.setSize( 0.5 * window.innerWidth, window.innerHeight );
		secondRenderer.domElement.style.display = 'block';

	} else {

		camera.aspect = window.innerWidth / window.innerHeight;
		renderer.setSize( window.innerWidth, window.innerHeight );

		secondRenderer.domElement.style.display = 'none';

	}
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio * params.resolutionScale );

	secondCamera.updateProjectionMatrix();
	secondRenderer.setPixelRatio( window.devicePixelRatio );

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
