import { EnvironmentControls, TilesRenderer } from '3d-tiles-renderer';
import {
	CesiumIonAuthPlugin,
	GLTFExtensionsPlugin,
	DebugTilesPlugin,
	ImplicitTilingPlugin,
	RegionTilesLoadingPlugin,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	Raycaster,
	Vector2,
	Mesh,
	CylinderGeometry,
	MeshBasicMaterial,
	Group,
	TorusGeometry,
	Sphere,
	Vector3,
	Quaternion,
} from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const NONE = 0;
const ALL_HITS = 1;
const FIRST_HIT_ONLY = 2;

const hashUrl = window.location.hash.replace( /^#/, '' );
let camera, controls, scene, renderer, tiles;
let box;
let raycaster, mouse, rayIntersect, lastHoveredElement;
let offsetParent, geospatialRotationParent;
let statsContainer, stats, regionTilesLoadingPlugin;


const apiKey =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyY2RiZTA3Ny03MGFlLTQzNzgtOWJmZi05YmNjMWMxNTQ5MjYiLCJpZCI6NzYzMTIsImlhdCI6MTYzOTM4MTc0N30.xJmr6nruHniCNAC1OBIp2sJs5DhIAZpXlXOiYBlasO4';

const params = {

	ionAssetId: '69380',
	ionAccessToken: apiKey,
	enableUpdate: true,
	raycast: 0,
	showOnlyTilesInRegion: false,
	optimizeRaycast: true,
	enableCacheDisplay: false,
	enableRendererStats: false,

	errorTarget: 6,
	errorThreshold: 60,
	maxDepth: 15,
	displayActiveTiles: false,
	resolutionScale: 1.0,

	up: hashUrl ? '+Z' : '+Y',
	enableDebug: true,
	displayParentBounds: false,
	displayBoxBounds: false,
	displaySphereBounds: false,
	displayRegionBounds: false,
	reload: reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	if ( tiles ) {

		geospatialRotationParent.remove( tiles.group );
		tiles.dispose();

	}

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const ktx2loader = new KTX2Loader();
	ktx2loader.setTranscoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/' );
	ktx2loader.detectSupport( renderer );

	tiles = new TilesRenderer( );
	tiles.registerPlugin(
		new CesiumIonAuthPlugin( {
			apiToken: params.ionAccessToken,
			assetId: params.ionAssetId,
		} )
	);
	tiles.maxByteSize = 536870912 * 2;
	tiles.maxSize = 10000;
	tiles.autoDisableRendererCulling = false;
	tiles.loadSiblings = true;
	regionTilesLoadingPlugin = new RegionTilesLoadingPlugin();
	tiles.registerPlugin( regionTilesLoadingPlugin );
	tiles.registerPlugin( new DebugTilesPlugin() );
	tiles.registerPlugin( new ImplicitTilingPlugin() );
	tiles.registerPlugin( new GLTFExtensionsPlugin( {
		rtc: true,
		dracoLoader: dracoLoader,
		ktxLoader: ktx2loader,
	} ) );

	tiles.fetchOptions.mode = 'cors';
	geospatialRotationParent.add( tiles.group );

	// Used with CUSTOM_COLOR
	tiles.customColorCallback = ( tile, object ) => {

		const depthIsEven = tile.__depth % 2 === 0;
		const hex = depthIsEven ? 0xff0000 : 0xffffff;
		object.traverse( c => {

			if ( c.isMesh ) {

				c.material.color.set( hex );

			}

		} );

	};

	tiles.addEventListener( 'load-tile-set', () => {

		// because ion examples typically are positioned on the planet surface we can orient
		// it such that up is Y+ and center the model
		const sphere = new Sphere();
		tiles.getBoundingSphere( sphere );

		const position = sphere.center.clone();
		const distanceToEllipsoidCenter = position.length();

		const surfaceDirection = position.normalize();
		const up = new Vector3( 0, 1, 0 );
		const rotationToNorthPole = rotationBetweenDirections( surfaceDirection, up );

		tiles.group.quaternion.x = rotationToNorthPole.x;
		tiles.group.quaternion.y = rotationToNorthPole.y;
		tiles.group.quaternion.z = rotationToNorthPole.z;
		tiles.group.quaternion.w = rotationToNorthPole.w;

		tiles.group.position.y = - distanceToEllipsoidCenter;

	}
	);

}

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
	camera.position.set( 100, 100, - 100 );
	camera.lookAt( 0, 0, 0 );
	scene.add( camera );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.adjustHeight = false;
	controls.minDistance = 1;
	controls.maxAltitude = Math.PI;

	// lights
	const dirLight = new DirectionalLight( 0xffffff, 4 );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	box = new Box3();

	offsetParent = new Group();
	scene.add( offsetParent );

	geospatialRotationParent = new Group();
	offsetParent.add( geospatialRotationParent );

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
	renderer.domElement.addEventListener( 'pointermove', onPointerMove, false );
	renderer.domElement.addEventListener( 'pointerdown', onPointerDown, false );
	renderer.domElement.addEventListener( 'pointerup', onPointerUp, false );
	renderer.domElement.addEventListener( 'pointerleave', onPointerLeave, false );


	// GUI
	const gui = new GUI();
	gui.width = 300;

	const tileOptions = gui.addFolder( 'Tiles Options' );
	tileOptions.add( params, 'displayActiveTiles' );
	tileOptions.add( params, 'errorTarget' ).min( 0 ).max( 50 );
	tileOptions.add( params, 'errorThreshold' ).min( 0 ).max( 1000 );
	tileOptions.add( params, 'maxDepth' ).min( 1 ).max( 100 );
	tileOptions.add( params, 'up', [ '+Y', '+Z', '-Z' ] );
	tileOptions.open();

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'enableDebug' );
	debug.add( params, 'displayParentBounds' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'displaySphereBounds' );
	debug.add( params, 'displayRegionBounds' );
	debug.open();

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'resolutionScale' ).min( 0.01 ).max( 2.0 ).step( 0.01 ).onChange( onWindowResize );
	exampleOptions.add( params, 'enableUpdate' ).onChange( v => {

		tiles.parseQueue.autoUpdate = v;
		tiles.downloadQueue.autoUpdate = v;

		if ( v ) {

			tiles.parseQueue.scheduleJobRun();
			tiles.downloadQueue.scheduleJobRun();

		}

	} );
	exampleOptions.add( params, 'raycast', { NONE, ALL_HITS, FIRST_HIT_ONLY } );
	exampleOptions.add( params, 'showOnlyTilesInRegion', );
	exampleOptions.add( params, 'optimizeRaycast', );
	exampleOptions.add( params, 'enableCacheDisplay' );
	exampleOptions.add( params, 'enableRendererStats' );
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
	renderer.setPixelRatio( window.devicePixelRatio * params.resolutionScale );

}

function onPointerLeave( e ) {

	lastHoveredElement = null;

}

function onPointerMove( e ) {

	const bounds = this.getBoundingClientRect();
	mouse.x = e.clientX - bounds.x;
	mouse.y = e.clientY - bounds.y;
	mouse.x = ( mouse.x / bounds.width ) * 2 - 1;
	mouse.y = - ( mouse.y / bounds.height ) * 2 + 1;

	lastHoveredElement = this;

}

const startPos = new Vector2();
const endPos = new Vector2();
function onPointerDown( e ) {

	const bounds = this.getBoundingClientRect();
	startPos.set( e.clientX - bounds.x, e.clientY - bounds.y );

}

function onPointerUp( e ) {

	const bounds = this.getBoundingClientRect();
	endPos.set( e.clientX - bounds.x, e.clientY - bounds.y );
	if ( startPos.distanceTo( endPos ) > 2 ) {

		return;

	}

	raycaster.setFromCamera( mouse, camera );

	raycaster.firstHitOnly = true;
	const results = raycaster.intersectObject( tiles.group, true );
	if ( results.length ) {

		const object = results[ 0 ].object;
		const info = tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' ).getTileInformationFromActiveObject( object );

		let str = '';
		for ( const key in info ) {

			let val = info[ key ];
			if ( typeof val === 'number' ) {

				val = Math.floor( val * 1e5 ) / 1e5;

			}

			let name = key;
			while ( name.length < 20 ) {

				name += ' ';

			}

			str += `${ name } : ${ val }\n`;

		}
		console.log( str );

	}

}

function animate() {

	requestAnimationFrame( animate );

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.errorThreshold = params.errorThreshold;
	tiles.optimizeRaycast = params.optimizeRaycast;
	tiles.displayActiveTiles = params.displayActiveTiles;
	tiles.maxDepth = params.maxDepth;

	// update plugin
	const plugin = tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' );
	plugin.enabled = params.enableDebug;
	plugin.displayBoxBounds = params.displayBoxBounds;
	plugin.displayParentBounds = params.displayParentBounds;
	plugin.displaySphereBounds = params.displaySphereBounds;
	plugin.displayRegionBounds = params.displayRegionBounds;


	controls.update();

	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );

	if ( tiles.root && tiles.root.boundingVolume.region ) {

		tiles.getOrientedBoundingBox( box, geospatialRotationParent.matrix );
		geospatialRotationParent.matrix.decompose( geospatialRotationParent.position, geospatialRotationParent.quaternion, geospatialRotationParent.scale );
		geospatialRotationParent.position.set( 0, 0, 0 );
		geospatialRotationParent.quaternion.invert();
		geospatialRotationParent.scale.set( 1, 1, 1 );

	}

	offsetParent.rotation.set( 0, 0, 0 );
	if ( params.up === '-Z' ) {

		offsetParent.rotation.x = Math.PI / 2;

	} else if ( params.up === '+Z' ) {

		offsetParent.rotation.x = - Math.PI / 2;

	}

	offsetParent.updateMatrixWorld( false );

	if ( parseFloat( params.raycast ) !== NONE && lastHoveredElement !== null ) {

		raycaster.setFromCamera( mouse, camera );

		raycaster.firstHitOnly = parseFloat( params.raycast ) === FIRST_HIT_ONLY;

		const results = raycaster.intersectObject( tiles.group, true );

		if ( regionTilesLoadingPlugin ) {

			regionTilesLoadingPlugin.clearRegions();


			if ( params.raycast ) {

				regionTilesLoadingPlugin.setOnlyLoadTilesInRegions( params.showOnlyTilesInRegion );
				regionTilesLoadingPlugin.addLoadRegion( { shape: raycaster.ray, errorTarget: 0 } );

			}

		}

		if ( results.length ) {

			const closestHit = results[ 0 ];
			const point = closestHit.point;
			rayIntersect.position.copy( point );

			// If the display bounds are visible they get intersected
			if ( closestHit.face ) {

				const normal = closestHit.face.normal;
				normal.transformDirection( closestHit.object.matrixWorld );
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

	} else {

		rayIntersect.visible = false;

	}


	if ( ! params.raycast ) {

		regionTilesLoadingPlugin.setOnlyLoadTilesInRegions( false );
		regionTilesLoadingPlugin.clearRegions();

	}

	// update tiles
	window.tiles = tiles;
	if ( params.enableUpdate ) {

		camera.updateMatrixWorld();
		tiles.update();

	}

	render();
	stats.update();

}

function render() {

	// render primary view

	const dist = camera.position.distanceTo( rayIntersect.position );
	rayIntersect.scale.setScalar( dist * camera.fov / 6000 );

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
