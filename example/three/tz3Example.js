import {
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	TZ3Plugin,
	ImplicitTilingPlugin,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	Sphere,
	Group,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, controls, scene, renderer, tiles, offsetParent;

const params = {
	// Replace with the URL of a publicly hosted .3tz file.
	url: new URLSearchParams( window.location.search ).get( 'url' ) || 'https://s3.us-east-2.wasabisys.com/testing/20260428-3tz-sampledata.3tz',
};

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		offsetParent.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	tiles = new TilesRenderer( params.url );
	tiles.registerPlugin( new TZ3Plugin() );
	tiles.registerPlugin( new ImplicitTilingPlugin() );

	tiles.addEventListener( 'load-tileset', () => {

		const box = new Box3();
		const sphere = new Sphere();
		if ( tiles.getBoundingBox( box ) ) {

			box.getCenter( tiles.group.position ).multiplyScalar( - 1 );

		} else if ( tiles.getBoundingSphere( sphere ) ) {

			tiles.group.position.copy( sphere.center ).multiplyScalar( - 1 );

		}

	} );

	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );
	offsetParent.add( tiles.group );

}

function init() {

	scene = new Scene();

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 400, 400, 400 );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	const dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );
	scene.add( dirLight );
	scene.add( new AmbientLight( 0xffffff, 0.2 ) );

	offsetParent = new Group();
	scene.add( offsetParent );

	reinstantiateTiles();

	window.addEventListener( 'resize', onWindowResize, false );
	onWindowResize();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );

	controls.update();
	camera.updateMatrixWorld();

	if ( tiles ) {

		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.update();

	}

	renderer.render( scene, camera );

}
