import { TilesRenderer } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	CameraHelper,
	Box3,
	Raycaster,
	Vector2,
	Mesh,
	CylinderBufferGeometry,
	MeshBasicMaterial,
	Group,
	TorusBufferGeometry,
	OrthographicCamera
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'three/examples/jsm/libs/dat.gui.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let camera, controls, scene, renderer, tiles, cameraHelper;
let thirdPersonCamera, thirdPersonRenderer, thirdPersonControls;
let orthoCamera, orthoCameraHelper;
let box;
let raycaster, mouse, rayIntersect;
let offsetParent;
let statsContainer, stats;

let params = {

	'orthographic': false,

	'errorTarget': 6,
	'errorThreshold': 60,
	'maxDepth': 15,
	'loadSiblings': true,

	'up': '+Y',
	'displayBounds': false,
	'showThirdPerson': true,
	'reload': reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	const url = window.location.hash.replace( /^#/, '' ) || './SampleTileset/tileset.json';

	if ( tiles ) {

		offsetParent.remove( tiles.group );

	}

	tiles = new TilesRenderer( url, camera, renderer );
	offsetParent.add( tiles.group );

}

function init() {

	// Third person camera view
	thirdPersonCamera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 3000 );
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

	thirdPersonControls = new OrbitControls( thirdPersonCamera, thirdPersonRenderer.domElement );
	thirdPersonControls.screenSpacePanning = false;
	thirdPersonControls.minDistance = 1;
	thirdPersonControls.maxDistance = 2000;

	// primary camera view
	scene = new Scene();

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	renderer.gammaInput = true;
	renderer.gameOutput = true;

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 2000 );
	camera.position.set( 100, 100, 100 );

	cameraHelper = new CameraHelper( camera );
	scene.add( cameraHelper );

	orthoCamera = new OrthographicCamera();

	orthoCameraHelper = new CameraHelper( orthoCamera );
	scene.add( orthoCameraHelper );


	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	var dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	var ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	box = new Box3();

	offsetParent = new Group();
	scene.add( offsetParent );

	// Raycasting init
	raycaster = new Raycaster();
	mouse = new Vector2();

	rayIntersect = new Group();

	const rayIntersectMat = new MeshBasicMaterial( { color: 0xe91e63 } );
	const rayMesh = new Mesh( new CylinderBufferGeometry( 0.25, 0.25, 10 ), rayIntersectMat );
	rayMesh.rotation.x = Math.PI / 2;
	rayMesh.position.z += 5;
	rayIntersect.add( rayMesh );

	const rayRing = new Mesh( new TorusBufferGeometry( 1.5, 0.2, 16, 100 ), rayIntersectMat );
	rayIntersect.add( rayRing );
	scene.add( rayIntersect );
	rayIntersect.visible = false;

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'mousemove', onMouseMove, false );

	// GUI
	const gui = new dat.GUI();
	const tiles = gui.addFolder( 'Tiles Options' );
	tiles.add( params, 'orthographic' );
	tiles.add( params, 'loadSiblings' );
	tiles.add( params, 'errorTarget' ).min( 0 ).max( 50 );
	tiles.add( params, 'errorThreshold' ).min( 0 ).max( 1000 );
	tiles.add( params, 'maxDepth' ).min( 1 ).max( 100 );
	tiles.add( params, 'up', [ '+Y', '-Z' ] );
	tiles.open();

	gui.add( params, 'displayBounds' );
	gui.add( params, 'showThirdPerson' );
	gui.add( params, 'reload' );

	gui.open();

	statsContainer = document.createElement( 'div' );
	statsContainer.style.position = 'absolute';
	statsContainer.style.top = 0;
	statsContainer.style.left = 0;
	statsContainer.style.color = 'white';
	statsContainer.style.width = '100%';
	statsContainer.style.textAlign = 'center';
	statsContainer.style.padding = '10px';
	document.body.appendChild( statsContainer );

	// Stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function onWindowResize() {

	thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
	thirdPersonCamera.updateProjectionMatrix();
	thirdPersonRenderer.setSize( Math.floor( window.innerWidth / 3 ), Math.floor( window.innerHeight / 3 ) );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

	updateOrthoCamera();

}

function onMouseMove( e ) {

	mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

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

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.errorThreshold = params.errorThreshold;
	tiles.loadSiblings = params.loadSiblings;
	tiles.maxDepth = params.maxDepth;
	tiles.displayBounds = params.displayBounds;
	tiles.cameras[ 0 ] = params.orthographic ? orthoCamera : camera;

	// update tiles
	tiles.update();
	window.tiles = tiles;

	offsetParent.rotation.set( 0, 0, 0 );
	if ( params.up === '-Z' ) {

		offsetParent.rotation.x = Math.PI / 2;

	}

	// update tiles center
	if ( tiles.getBounds( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	}

	raycaster.setFromCamera( mouse, params.orthographic ? orthoCamera : camera );
	raycaster.firstHitOnly = true;
	const results = raycaster.intersectObject( tiles.group, true );
	if ( results.length ) {

		const closestHit = results[ 0 ];
		const point = closestHit.point;
		rayIntersect.position.copy( point );

		// If the display bounds are visible they get intersected
		if ( closestHit.face ) {

			const normal = closestHit.face.normal;
			rayIntersect.lookAt(
				point.x + normal.x,
				point.y + normal.y,
				point.z + normal.z
			);

		}

		rayIntersect.visible = true;

	} else {

		rayIntersect.visible = false;

	}

	stats.begin();
	render();
	stats.end();

	requestAnimationFrame( animate );

}

function render() {

	updateOrthoCamera();

	// render primary view
	cameraHelper.visible = false;
	orthoCameraHelper.visible = false;
	renderer.render( scene, params.orthographic ? orthoCamera : camera );

	// render third person view
	thirdPersonRenderer.domElement.style.visibility = params.showThirdPerson ? 'visible' : 'hidden';
	if ( params.showThirdPerson ) {

		cameraHelper.update();
		cameraHelper.visible = ! params.orthographic;

		orthoCameraHelper.update();
		orthoCameraHelper.visible = params.orthographic;
		thirdPersonRenderer.render( scene, thirdPersonCamera );

	}

	statsContainer.innerText =
		`Downloading: ${tiles.stats.downloading} Parsing: ${tiles.stats.parsing} Visible: ${tiles.group.children.length}`;

}
