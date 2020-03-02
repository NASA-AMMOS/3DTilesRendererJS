import { ThreeTilesRenderer } from '../src/ThreeTilesRenderer.js';
import { Scene, DirectionalLight, AmbientLight, WebGLRenderer, PerspectiveCamera, CameraHelper, Box3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'three/examples/jsm/libs/dat.gui.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let camera, controls, scene, renderer, tiles, cameraHelper;
let thirdPersonCamera, thirdPersonRenderer, thirdPersonControls;
let box;
let statsContainer, stats;

let params = {

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

		scene.remove( tiles.group );

	}

	tiles = new ThreeTilesRenderer( url, camera, renderer );
	scene.add( tiles.group );

}

function init() {

	// Third person camera view
	thirdPersonCamera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 3000 );
	thirdPersonCamera.position.set( 50, 40, 40 );
	thirdPersonCamera.lookAt( 0, 0, 0 );

	thirdPersonRenderer = new WebGLRenderer( { antialias: true } );
	thirdPersonRenderer.setPixelRatio( window.devicePixelRatio );
	thirdPersonRenderer.setSize( window.innerWidth, window.innerHeight );
	thirdPersonRenderer.setClearColor( 0xdddddd );

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
	renderer.setClearColor( 0xcccccc );
	renderer.gammaInput = true;
	renderer.gameOutput = true;

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 2000 );
	camera.position.set( 100, 100, 100 );

	cameraHelper = new CameraHelper( camera );
	scene.add( cameraHelper );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	var dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 1, 1 );
	scene.add( dirLight );

	var ambLight = new AmbientLight( 0x222222 );
	scene.add( ambLight );

	box = new Box3();

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new dat.GUI();
	const tiles = gui.addFolder( 'Tiles Options' );
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

	// TilesRenderer stats display
	let textShadow = [];
	for ( let x = - 1; x <= 1; x ++ ) {

		for ( let y = - 1; y <= 1; y ++ ) {

			let valX = x;
			let valY = y;

			if ( valX !== 0 && valY !== 0 ) {

				valX *= Math.cos( Math.PI / 4 );
				valY *= Math.sin( Math.PI / 4 );

			}

			valX *= 1.5;
			valY *= 1.5;

			textShadow.push( `white ${ valX }px ${ valY }px 0` );

		}

	}

	statsContainer = document.createElement( 'div' );
	statsContainer.style.position = 'absolute';
	statsContainer.style.top = 0;
	statsContainer.style.left = 0;
	statsContainer.style.width = '100%';
	statsContainer.style.textAlign = 'center';
	statsContainer.style.textShadow = textShadow.join( ',' );
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

}

function animate() {

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.errorThreshold = params.errorThreshold;
	tiles.loadSiblings = params.loadSiblings;
	tiles.maxDepth = params.maxDepth;
	tiles.displayBounds = params.displayBounds;

	// update tiles
	tiles.update();
	window.tiles = tiles;

	// update tiles center
	if ( tiles.getBounds( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	}

	stats.begin();
	render();
	stats.end();

	requestAnimationFrame( animate );

}

function render() {

	tiles.group.rotation.set( 0, 0, 0 );
	if ( params.up === '-Z' ) {

		tiles.group.rotation.x = Math.PI / 2;

	}


	// render primary view
	cameraHelper.visible = false;
	renderer.render( scene, camera );

	// render third person view
	thirdPersonRenderer.domElement.style.visibility = params.showThirdPerson ? 'visible' : 'hidden';
	if ( params.showThirdPerson ) {

		cameraHelper.visible = true;
		thirdPersonRenderer.render( scene, thirdPersonCamera );

	}

	statsContainer.innerText =
		`Downloading: ${tiles.stats.downloading} Parsing: ${tiles.stats.parsing} Visible: ${tiles.group.children.length}`;

}
