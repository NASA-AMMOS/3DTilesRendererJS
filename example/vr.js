import {
	DebugTilesRenderer as TilesRenderer,
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
	Box3,
	Raycaster,
	Mesh,
	MeshBasicMaterial,
	Group,
	TorusBufferGeometry,
	sRGBEncoding,
	GridHelper,
	BufferGeometry,
	Float32BufferAttribute,
	LineBasicMaterial,
	AdditiveBlending,
	Line,
	Vector3,
	RingBufferGeometry,
	Sphere,
} from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let camera, scene, renderer, tiles;
let workspace;
let box, sphere, grid;
let raycaster, fwdVector, intersectRing;
let offsetParent;
let controller, controllerGrip;
let xrSession = null;
const tasks = [];
const upVector = new Vector3( 0, 1, 0 );

const params = {

	'displayBoxBounds': false,
	'colorMode': 0,
	'displayGrid': true,

};

init();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xbbbbbb );
	renderer.outputEncoding = sRGBEncoding;
	renderer.xr.enabled = true;

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	renderer.setAnimationLoop( animate );

	// create workspace
	workspace = new Group();
	scene.add( workspace );

	grid = new GridHelper( 10, 10, 0xffffff, 0xffffff );
	grid.material.transparent = true;
	grid.material.opacity = 0.5;
	grid.material.depthWrite = false;
	workspace.add( grid );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 4000 );
	camera.position.set( 0, 1, 0 );
	workspace.add( camera );

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	// tile set
	box = new Box3();
	sphere = new Sphere();

	// parent for centering the tileset
	offsetParent = new Group();
	offsetParent.rotation.x = Math.PI / 2;
	offsetParent.position.y = 32;
	scene.add( offsetParent );

	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/scene-tileset.json' );
	offsetParent.add( tiles.group );

	// We set camera for tileset
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );


	// We define a custom scheduling callback to handle also active WebXR sessions
	const tilesSchedulingCB = func => {

		tasks.push( func );

	};

	// We set our scheduling callback for tiles downloading and parsing
	tiles.downloadQueue.schedulingCallback = tilesSchedulingCB;
	tiles.parseQueue.schedulingCallback = tilesSchedulingCB;

	tiles.lruCache.maxSize = 1200;
	tiles.lruCache.minSize = 900;

	// Raycasting init
	raycaster = new Raycaster();
	fwdVector = new Vector3( 0, 0, 1 );

	const rayIntersectMat = new MeshBasicMaterial( { color: 0xb2dfdb } );
	intersectRing = new Mesh( new TorusBufferGeometry( 1.5, 0.2, 16, 100 ), rayIntersectMat );
	intersectRing.visible = false;
	scene.add( intersectRing );

	// vr setup
	document.body.appendChild( VRButton.createButton( renderer ) );

	controller = renderer.xr.getController( 0 );
	controller.addEventListener( 'selectstart', () => {

		if ( intersectRing.visible ) {

			workspace.position.copy( intersectRing.position );

		}

	} );
	controller.addEventListener( 'connected', function ( event ) {

		this.controllerActive = true;
		this.add( buildController( event.data ) );

	} );
	controller.addEventListener( 'disconnected', function () {

		this.controllerActive = false;
		this.remove( this.children[ 0 ] );

	} );
	workspace.add( controller );

	// controller models
	const controllerModelFactory = new XRControllerModelFactory();
	controllerGrip = renderer.xr.getControllerGrip( 0 );
	controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
	workspace.add( controllerGrip );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'displayGrid' );
	gui.add( params, 'displayBoxBounds' );
	gui.add( params, 'colorMode', {

		NONE,
		SCREEN_ERROR,
		GEOMETRIC_ERROR,
		DISTANCE,
		DEPTH,
		RELATIVE_DEPTH,
		IS_LEAF,
		RANDOM_COLOR,

	} );
	gui.open();

}

function buildController( data ) {

	let geometry, material;

	switch ( data.targetRayMode ) {

		case 'tracked-pointer':

			geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
			geometry.setAttribute( 'color', new Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

			material = new LineBasicMaterial( {
				vertexColors: true,
				blending: AdditiveBlending,
				depthWrite: false,
				transparent: true,
			} );

			return new Line( geometry, material );

		case 'gaze':

			geometry = new RingBufferGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
			material = new MeshBasicMaterial( { opacity: 0.5, transparent: true } );
			return new Mesh( geometry, material );

	}

}

function onWindowResize() {

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

function handleCamera() {

	// get the XR camera with a combined frustum for culling
	if ( renderer.xr.isPresenting ) {

		if ( xrSession === null ) { // We setup XR camera once

			const xrCamera = renderer.xr.getCamera( camera );

			// remove all cameras so we can use the VR camera instead
			tiles.cameras.forEach( c => tiles.deleteCamera( c ) );
			tiles.setCamera( xrCamera );

			const leftCam = xrCamera.cameras[ 0 ];
			if ( leftCam ) {

				tiles.setResolution( xrCamera, leftCam.viewport.z, leftCam.viewport.w );

			}

			xrSession = renderer.xr.getSession();

		}

	} else {

		// Reset default camera (exiting WebXR session)
		if ( xrSession !== null ) {

			tiles.cameras.forEach( c => tiles.deleteCamera( c ) );

			tiles.setCamera( camera );
			tiles.setResolutionFromRenderer( camera, renderer );

			camera.position.set( 0, 1, 0 );

			xrSession = null;

		}

	}

}

function handleTasks() {

	for ( let t = 0, l = tasks.length; t < l; t ++ ) {

		tasks[ t ]();

	}
	tasks.length = 0;

}

function animate() {

	grid.visible = params.displayGrid;

	// update options
	tiles.displayBoxBounds = params.displayBoxBounds;
	tiles.colorMode = parseFloat( params.colorMode );

	// update tiles center
	if ( tiles.getBounds( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	} else if ( tiles.getBoundingSphere( sphere ) ) {

		tiles.group.position.copy( sphere.center );
		tiles.group.position.multiplyScalar( - 1 );

	}

	// We check for tiles camera setup (default and XR sessions)
	handleCamera();

	// We handle pending tasks
	handleTasks();

	tiles.update();

	if ( controller.controllerActive ) {

		const { ray } = raycaster;
		raycaster.firstHitOnly = true;

		// get the controller ray
		ray.origin
			.copy( controller.position )
			.applyMatrix4( workspace.matrixWorld );
		controller
			.getWorldDirection( ray.direction )
			.multiplyScalar( - 1 );

		const results = raycaster.intersectObject( tiles.group, true );
		if ( results.length ) {

			const hit = results[ 0 ];

			hit.face.normal.transformDirection( tiles.group.matrixWorld );
			intersectRing.position.copy( hit.point );
			intersectRing.quaternion.setFromUnitVectors(
				fwdVector,
				hit.face.normal,
			);
			intersectRing.visible = true;

			// scale ring based on distance
			const scale = workspace.position.distanceTo( intersectRing.position ) * camera.fov / 4000;
			intersectRing.scale.setScalar( scale );

			// only teleport to mostly horizontal surfaces
			if ( hit.face.normal.dot( upVector ) < 0.15 ) {

				intersectRing.visible = false;

			}

		} else {

			intersectRing.visible = false;

		}

	} else {

		intersectRing.visible = false;

	}

	// render primary view
	renderer.render( scene, camera );

}
