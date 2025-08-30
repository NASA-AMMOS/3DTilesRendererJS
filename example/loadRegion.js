import { EnvironmentControls, TilesRenderer } from '3d-tiles-renderer';
import {
	DebugTilesPlugin,
	LoadRegionPlugin,
	RayRegion,
	OBBRegion,
	SphereRegion,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	Mesh,
	Vector3,
	SphereGeometry,
	BoxGeometry,
	Clock,
	Line,
} from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

let camera, controls, scene, renderer, tiles;
let rayRegion, sphereRegion, boxRegion;
let sphereMesh, rayMesh, boxMesh;
let clock, time = 0;

const params = {

	animate: true,
	region: 'SPHERE',
	regionErrorTarget: 0.1,
	regionOnly: true,
	mask: false,
	displayBoxBounds: false,

};

init();
animate();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	// update the camera
	camera = new PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		1,
		100000
	);
	camera.position.set( 100, 100, 100 );
	camera.lookAt( 0, 0, 0 );
	scene.add( camera );

	// clock
	clock = new Clock();

	// init tiles
	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	tiles.registerPlugin( new DebugTilesPlugin() );
	tiles.registerPlugin( new LoadRegionPlugin() );
	tiles.group.rotation.x = Math.PI / 2;
	scene.add( tiles.group );

	// controls
	controls = new EnvironmentControls( tiles.group, camera, renderer.domElement );
	controls.enableDamping = true;

	// initialize regions
	rayRegion = new RayRegion();
	sphereRegion = new SphereRegion();
	sphereRegion.sphere.radius = 15;
	boxRegion = new OBBRegion();
	boxRegion.obb.box.min = new Vector3( - 50, - 50, - 5 );
	boxRegion.obb.box.max = new Vector3( 50, 50, 5 );

	// initialize region meshes
	sphereMesh = new Mesh( new SphereGeometry() );
	sphereMesh.material.transparent = true;
	sphereMesh.material.opacity = 0.25;

	boxMesh = new Mesh( new BoxGeometry() );
	boxMesh.material.transparent = true;
	boxMesh.material.opacity = 0.25;

	rayMesh = new Line();
	rayMesh.geometry.setFromPoints( [ new Vector3(), new Vector3( 0, - 1000, 0 ) ] );
	rayMesh.material.opacity = 0.5;
	rayMesh.material.transparent = true;

	// update the region to display
	updateRegion( params.region );

	// update camera parameters
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'region', [ 'SPHERE', 'BOX', 'RAY' ] ).onChange( updateRegion );
	gui.add( params, 'regionErrorTarget' ).min( 0 ).max( 1 );
	gui.add( params, 'animate' );
	gui.add( params, 'mask' );
	gui.add( params, 'regionOnly' ).onChange( v => {

		if ( ! v ) {

			tiles.setCamera( camera );
			onWindowResize();

		} else {

			tiles.deleteCamera( camera );

		}

	} );
	gui.add( params, 'displayBoxBounds' );

	gui.open();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio * 1 );
	tiles.setResolutionFromRenderer( camera, renderer );

}

function updateRegion( region ) {

	const plugin = tiles.getPluginByName( 'LOAD_REGION_PLUGIN' );
	plugin.clearRegions();
	scene.remove( rayMesh, sphereMesh, boxMesh );

	if ( region === 'SPHERE' ) {

		plugin.addRegion( sphereRegion );
		scene.add( sphereMesh );

	} else if ( region === 'RAY' ) {

		plugin.addRegion( rayRegion );
		scene.add( rayMesh );

	} else if ( region === 'BOX' ) {

		plugin.addRegion( boxRegion );
		scene.add( boxMesh );

	}

}


function animate() {

	requestAnimationFrame( animate );

	// update time step
	if ( params.animate ) {

		time += clock.getDelta();

	} else {

		clock.getDelta();

	}

	// update debug plugin
	const debugPlugin = tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' );
	debugPlugin.enabled = params.displayBoxBounds;
	debugPlugin.displayBoxBounds = params.displayBoxBounds;

	// update the regions
	if ( params.region === 'SPHERE' ) {

		sphereMesh.position.set( Math.sin( time ) * 20, 0, Math.cos( time ) * 20 );
		sphereMesh.scale.setScalar( sphereRegion.sphere.radius );

		sphereRegion.mask = params.mask;
		sphereRegion.errorTarget = params.mask ? Infinity : params.regionErrorTarget;
		sphereRegion.sphere.center
			.copy( sphereMesh.position )
			.applyMatrix4( tiles.group.matrixWorldInverse );

	} else if ( params.region === 'RAY' ) {

		rayMesh.position.set( Math.sin( time * 2 ) * 20, 50, Math.cos( time * 2 ) * 20 );

		rayRegion.mask = params.mask;
		rayRegion.errorTarget = params.mask ? Infinity : params.regionErrorTarget;
		rayRegion.ray.direction
			.set( 0, - 1, 0 )
			.transformDirection( tiles.group.matrixWorldInverse );
		rayRegion.ray.origin
			.copy( rayMesh.position )
			.applyMatrix4( tiles.group.matrixWorldInverse );

	} else if ( params.region === 'BOX' ) {

		boxMesh.scale.set( 50, 10, 50 );
		boxMesh.rotation.y = time;
		boxMesh.updateMatrixWorld();
		boxMesh.geometry.computeBoundingBox();

		boxRegion.mask = params.mask;
		boxRegion.errorTarget = params.mask ? Infinity : params.regionErrorTarget;
		boxRegion.obb.box.copy( boxMesh.geometry.boundingBox );
		boxRegion.obb.transform.copy( boxMesh.matrixWorld ).premultiply( tiles.group.matrixWorldInverse );
		boxRegion.obb.update();

	}

	// update tiles
	controls.update();
	camera.updateMatrixWorld();
	tiles.update();

	// render
	renderer.render( scene, camera );

}
