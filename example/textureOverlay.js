import {
	TilesRenderer,
} from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
} from 'three';
import { FlyOrbitControls } from './src/controls/FlyOrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Box3 } from 'three';
import { Sphere } from 'three';
import { TextureOverlayTilesRendererMixin } from './src/TextureOverlayTilesRenderer.js';
import { DataTexture } from 'three';

let camera, controls, scene, renderer;
let tiles;

const params = {

	errorTarget: 12,

};

init();
render();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xd8cec0 );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 20, 10, 20 ).multiplyScalar( 20 );

	// controls
	controls = new FlyOrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;
	controls.maxPolarAngle = Math.PI / 2;
	controls.baseSpeed = 0.1;
	controls.fastSpeed = 0.2;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	const tilesParent = new Group();
	tilesParent.rotation.set( Math.PI / 2, 0, 0 );
	scene.add( tilesParent );

	const cons = TextureOverlayTilesRendererMixin( TilesRenderer );

	const url = '../data/tileset.json';
	tiles = new cons( url );
	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.errorTarget = 12;

	const db = new DataTexture( new Uint8Array( [ 0, 255, 0, 25 ] ) );
	db.needsUpdate = true;

	tiles.registerLayer( 'red', async () => {

		const dt = new DataTexture( new Uint8Array( [ 255, 0, 0, 25 ] ) );
		dt.needsUpdate = true;
		return dt;

	} );

	tiles.registerLayer( 'blue', async () => {

		const dt = new DataTexture( new Uint8Array( [ 0, 0, 255, 25 ] ) );
		dt.needsUpdate = true;
		return dt;

	} );

	window.UNREGISTER = () => tiles.unregisterLayer( 'red' );


	tilesParent.add( tiles.group );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	const gui = new GUI();
	gui.add( params, 'errorTarget', 0, 100 );
	gui.open();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function render() {

	requestAnimationFrame( render );

	camera.updateMatrixWorld();

	tiles.errorTarget = params.errorTarget;

	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	tiles.group.rotation.x = - Math.PI / 2;

	const box = new Box3();
	const sphere = new Sphere();
	if ( tiles.getBoundingBox( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	} else if ( tiles.getBoundingSphere( sphere ) ) {

		tiles.group.position.copy( sphere.center );
		tiles.group.position.multiplyScalar( - 1 );

	}

	tiles.group.position.z -= - 150;

	renderer.render( scene, camera );

}
