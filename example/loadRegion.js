import { EnvironmentControls, TilesRenderer, OBB } from '3d-tiles-renderer';
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
	Raycaster,
	Vector2,
	Mesh,
	CylinderGeometry,
	MeshStandardMaterial,
	Group,
	Ray,
	Vector3,
	SphereGeometry,
	BoxGeometry,
	Sphere,
	DoubleSide,
	AmbientLight,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let camera, controls, scene, renderer, tiles;
let raycaster, mouse, rayIntersect;
let statsContainer, stats, regionTilesLoadingPlugin;
const rayRegion = new RayRegion( 0, new Ray() );
const sphereRegion = new SphereRegion( 0, new Sphere() );
sphereRegion.sphere.radius = 30;
const obbRegion = new OBBRegion( 0, new OBB() );
obbRegion.obb.box.min = new Vector3( - 50, - 50, - 5 );
obbRegion.obb.box.max = new Vector3( 50, 50, 5 );
const LoadRayRegion = 1;
const LoadSphereRegion = 2;
const LoadOBBRegion = 3;
const NONE = 0;

const rayIntersectMat = new MeshStandardMaterial( { color: 0xffffff, side: DoubleSide, emissive: 0xffffff } );
rayIntersectMat.transparent = true;
rayIntersectMat.opacity = 1;
const sphereIntersectMat = rayIntersectMat.clone();
sphereIntersectMat.opacity = 0.3;
const boxIntersectMat = rayIntersectMat.clone();
boxIntersectMat.opacity = 0.3;


const params = {

	enableUpdate: true,
	loadRegion: 0,
	enableCacheDisplay: true,
	enableRendererStats: true,
	errorTarget: 1000,
	displayBoxBounds: true,
	reload: reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	const url = window.location.hash.replace( /^#/, '' ) || '../data/tileset.json';

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();

	}

	tiles = new TilesRenderer( url );
	tiles.registerPlugin( new DebugTilesPlugin() );

	tiles.fetchOptions.mode = 'cors';



	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );

	regionTilesLoadingPlugin = new LoadRegionPlugin();
	tiles.registerPlugin( regionTilesLoadingPlugin );

	scene.add( tiles.group );

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

	camera = new PerspectiveCamera(
		60,
		window.innerWidth / window.innerHeight,
		1,
		100000
	);
	camera.position.set( 100, 100, 100 );
	camera.lookAt( 0, 0, 0 );
	scene.add( camera );


	const ambLight = new AmbientLight( 0xffffff, 1 );
	scene.add( ambLight );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.adjustHeight = false;
	controls.minDistance = 1;
	controls.maxAltitude = Math.PI;

	// Raycasting init
	raycaster = new Raycaster();
	mouse = new Vector2();

	rayIntersect = new Group();

	const rayMesh = new Mesh( new CylinderGeometry( 1, 1, 1000 ), rayIntersectMat );
	rayMesh.rotation.y = Math.PI / 2;
	rayMesh.position.y += 500;
	const sphereMesh = new Mesh( new SphereGeometry( 30, 32, 32 ), sphereIntersectMat );
	const boxMesh = new Mesh( new BoxGeometry( 100, 100, 10 ), boxIntersectMat );
	rayIntersect.add( rayMesh );
	rayIntersect.add( boxMesh );
	rayIntersect.add( sphereMesh );
	scene.add( rayIntersect );
	rayIntersect.visible = false;

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	renderer.domElement.addEventListener( 'pointermove', onPointerMove, false );


	// GUI
	const gui = new GUI();
	gui.width = 300;

	const tileOptions = gui.addFolder( 'Tiles Options' );
	tileOptions.add( params, 'errorTarget' ).min( 0 ).max( 1000 );
	tileOptions.open();

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'enableCacheDisplay' );
	debug.add( params, 'enableRendererStats' );
	debug.add( params, 'displayBoxBounds' );
	debug.open();

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'loadRegion', { NONE, LoadRayRegion, LoadSphereRegion, LoadOBBRegion } );
	exampleOptions.open();

	gui.add( params, 'reload' );
	gui.open();

	statsContainer = document.createElement( 'div' );
	statsContainer.style.position = 'absolute';
	statsContainer.style.top = 0;
	statsContainer.style.left = 0;
	statsContainer.style.color = 'white';
	statsContainer.style.width = '100%';
	statsContainer.style.textAlign = 'center';
	statsContainer.style.padding = '5px';
	statsContainer.style.pointerEvents = 'none';
	statsContainer.style.lineHeight = '1.5em';
	document.body.appendChild( statsContainer );

	// Stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio * 1 );

}

function onPointerMove( e ) {

	const bounds = this.getBoundingClientRect();
	mouse.x = e.clientX - bounds.x;
	mouse.y = e.clientY - bounds.y;
	mouse.x = ( mouse.x / bounds.width ) * 2 - 1;
	mouse.y = - ( mouse.y / bounds.height ) * 2 + 1;

}


function animate() {

	requestAnimationFrame( animate );

	// update options
	tiles.errorTarget = params.errorTarget;

	// update plugin
	const plugin = tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' );
	plugin.enabled = true;
	plugin.displayBoxBounds = params.displayBoxBounds;


	controls.update();

	if ( params.loadRegion && regionTilesLoadingPlugin ) {

		raycaster.setFromCamera( mouse, camera );

		raycaster.firstHitOnly = true;

		const results = raycaster.intersectObject( tiles.group, true );

		if ( results.length ) {

			const closestHit = results[ 0 ];
			const point = closestHit.point;
			rayIntersect.position.copy( point );

			// If the display bounds are visible they get intersected
			if ( closestHit.face ) {

				rayIntersectMat.visible = false;
				sphereIntersectMat.visible = false;
				boxIntersectMat.visible = false;
				if ( params.loadRegion === LoadRayRegion ) {

					rayIntersectMat.visible = true;

					if ( regionTilesLoadingPlugin.hasRegion( rayRegion ) ) {

						rayRegion.ray.origin.copy( point );
						rayRegion.ray.direction.set( 0, 1, 0 );

					} else {

						regionTilesLoadingPlugin.addRegion( rayRegion );

					}

					regionTilesLoadingPlugin.removeRegion( sphereRegion );
					regionTilesLoadingPlugin.removeRegion( obbRegion );

				} else if ( params.loadRegion === LoadSphereRegion ) {

					sphereIntersectMat.visible = true;

					if ( regionTilesLoadingPlugin.hasRegion( sphereRegion ) ) {

						sphereRegion.sphere.center.copy( point );

					} else {

						regionTilesLoadingPlugin.addRegion( sphereRegion );

					}

					regionTilesLoadingPlugin.removeRegion( rayRegion );
					regionTilesLoadingPlugin.removeRegion( obbRegion );

				} else if ( params.loadRegion === LoadOBBRegion ) {

					boxIntersectMat.visible = true;

					if ( regionTilesLoadingPlugin.hasRegion( obbRegion ) ) {

						obbRegion.obb.transform.makeTranslation( point.x, point.y, point.z );
						obbRegion.obb.update();

					} else {

						regionTilesLoadingPlugin.addRegion( obbRegion );

					}

					regionTilesLoadingPlugin.removeRegion( rayRegion );
					regionTilesLoadingPlugin.removeRegion( sphereRegion );

				}



			}

			rayIntersect.visible = true;

		} else {

			rayIntersect.visible = false;

		}

	} else {

		rayIntersect.visible = false;

	}


	if ( ! params.loadRegion ) {

		regionTilesLoadingPlugin.removeRegion( rayRegion );
		regionTilesLoadingPlugin.removeRegion( sphereRegion );
		regionTilesLoadingPlugin.removeRegion( obbRegion );

	}

	// update tiles
	window.tiles = tiles;
	camera.updateMatrixWorld();
	tiles.update();

	render();
	stats.update();

}

function render() {

	// render primary view

	// const dist = camera.position.distanceTo( rayIntersect.position );
	rayIntersect.scale.setScalar( 1 );

	renderer.render( scene, camera );

	const cacheFullness = tiles.lruCache.itemList.length / tiles.lruCache.maxSize;
	let str = `Downloading: ${ tiles.stats.downloading } Parsing: ${ tiles.stats.parsing } Visible: ${ tiles.visibleTiles.size }`;

	if ( params.enableCacheDisplay ) {

		const geomSet = new Set();
		tiles.traverse( tile => {

			const scene = tile.cached.scene;
			if ( scene ) {

				scene.traverse( c => {

					if ( c.geometry ) {

						geomSet.add( c.geometry );

					}

				} );

			}

		} );

		let count = 0;
		geomSet.forEach( g => {

			count += BufferGeometryUtils.estimateBytesUsed( g );

		} );
		str += `<br/>Cache: ${ ( 100 * cacheFullness ).toFixed( 2 ) }% ~${ ( count / 1000 / 1000 ).toFixed( 2 ) }mb`;

	}

	if ( params.enableRendererStats ) {

		const memory = renderer.info.memory;
		const programCount = renderer.info.programs.length;
		str += `<br/>Geometries: ${ memory.geometries } Textures: ${ memory.textures } Programs: ${ programCount }`;

	}

	if ( statsContainer.innerHTML !== str ) {

		statsContainer.innerHTML = str;

	}

}
