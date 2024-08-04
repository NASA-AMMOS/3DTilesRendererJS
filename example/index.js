import {
	TilesRenderer,
	DebugTilesPlugin,
	GLTFCesiumRTCExtension,
	NONE,
	SCREEN_ERROR,
	GEOMETRIC_ERROR,
	DISTANCE,
	DEPTH,
	RELATIVE_DEPTH,
	IS_LEAF,
	RANDOM_COLOR,
	RANDOM_NODE_COLOR,
	CUSTOM_COLOR,
	LOAD_ORDER,
} from '../src/index.js';
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
	CylinderGeometry,
	MeshBasicMaterial,
	Group,
	TorusGeometry,
	OrthographicCamera,
	Sphere,
} from 'three';
import { FlyOrbitControls } from './src/controls/FlyOrbitControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const ALL_HITS = 1;
const FIRST_HIT_ONLY = 2;

const hashUrl = window.location.hash.replace( /^#/, '' );
let camera, controls, scene, renderer, tiles, cameraHelper;
let thirdPersonCamera, thirdPersonRenderer, thirdPersonControls;
let secondRenderer, secondCameraHelper, secondControls, secondCamera;
let orthoCamera, orthoCameraHelper;
let box, sphere;
let raycaster, mouse, rayIntersect, lastHoveredElement;
let offsetParent, geospatialRotationParent;
let statsContainer, stats;

const params = {

	enableUpdate: true,
	raycast: NONE,
	optimizeRaycast: true,
	enableCacheDisplay: false,
	enableRendererStats: false,
	orthographic: false,

	errorTarget: 6,
	errorThreshold: 60,
	maxDepth: 15,
	displayActiveTiles: false,
	resolutionScale: 1.0,

	up: hashUrl ? '+Z' : '+Y',
	displayBoxBounds: false,
	displaySphereBounds: false,
	displayRegionBounds: false,
	colorMode: 0,
	showThirdPerson: false,
	showSecondView: false,
	reload: reinstantiateTiles,

};

init();
animate();

function reinstantiateTiles() {

	const url = hashUrl || '../data/tileset.json';

	if ( tiles ) {

		geospatialRotationParent.remove( tiles.group );
		tiles.dispose();

	}

	tiles = new TilesRenderer( url );
	tiles.registerPlugin( new DebugTilesPlugin() );

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );

	const ktx2loader = new KTX2Loader();
	ktx2loader.setTranscoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/' );
	ktx2loader.detectSupport( renderer );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );
	loader.setKTX2Loader( ktx2loader );
	loader.register( () => new GLTFCesiumRTCExtension() );

	tiles.fetchOptions.mode = 'cors';
	tiles.manager.addHandler( /\.gltf$/, loader );
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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
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
	secondControls.maxDistance = 5000;

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
	thirdPersonControls.maxDistance = 5000;

	// controls
	controls = new FlyOrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 5000;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	box = new Box3();
	sphere = new Sphere();

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

	secondRenderer.domElement.addEventListener( 'pointermove', onPointerMove, false );
	secondRenderer.domElement.addEventListener( 'pointerdown', onPointerDown, false );
	secondRenderer.domElement.addEventListener( 'pointerup', onPointerUp, false );
	secondRenderer.domElement.addEventListener( 'pointerleave', onPointerLeave, false );


	// GUI
	const gui = new GUI();
	gui.width = 300;

	const tileOptions = gui.addFolder( 'Tiles Options' );
	tileOptions.add( params, 'stopAtEmptyTiles' );
	tileOptions.add( params, 'displayActiveTiles' );
	tileOptions.add( params, 'errorTarget' ).min( 0 ).max( 50 );
	tileOptions.add( params, 'errorThreshold' ).min( 0 ).max( 1000 );
	tileOptions.add( params, 'maxDepth' ).min( 1 ).max( 100 );
	tileOptions.add( params, 'up', [ '+Y', '+Z', '-Z' ] );
	tileOptions.open();

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'displaySphereBounds' );
	debug.add( params, 'displayRegionBounds' );
	debug.add( params, 'colorMode', {

		NONE,
		SCREEN_ERROR,
		GEOMETRIC_ERROR,
		DISTANCE,
		DEPTH,
		RELATIVE_DEPTH,
		IS_LEAF,
		RANDOM_COLOR,
		RANDOM_NODE_COLOR,
		CUSTOM_COLOR,
		LOAD_ORDER,

	} );
	debug.open();

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'resolutionScale' ).min( 0.01 ).max( 2.0 ).step( 0.01 ).onChange( onWindowResize );
	exampleOptions.add( params, 'orthographic' );
	exampleOptions.add( params, 'showThirdPerson' );
	exampleOptions.add( params, 'showSecondView' ).onChange( onWindowResize );
	exampleOptions.add( params, 'enableUpdate' ).onChange( v => {

		tiles.parseQueue.autoUpdate = v;
		tiles.downloadQueue.autoUpdate = v;

		if ( v ) {

			tiles.parseQueue.scheduleJobRun();
			tiles.downloadQueue.scheduleJobRun();

		}

	} );
	exampleOptions.add( params, 'raycast', { NONE, ALL_HITS, FIRST_HIT_ONLY } );
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

	updateOrthoCamera();

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

	if ( lastHoveredElement === secondRenderer.domElement ) {

		raycaster.setFromCamera( mouse, secondCamera );

	} else {

		raycaster.setFromCamera( mouse, params.orthographic ? orthoCamera : camera );

	}

	raycaster.firstHitOnly = true;
	const results = raycaster.intersectObject( tiles.group, true );
	if ( results.length ) {

		const object = results[ 0 ].object;
		const info = tiles.getTileInformationFromActiveObject( object );

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

function updateOrthoCamera() {

	orthoCamera.position.copy( camera.position );
	orthoCamera.rotation.copy( camera.rotation );

	const scale = camera.position.distanceTo( controls.target ) / 2.0;
	let aspect = window.innerWidth / window.innerHeight;
	if ( params.showSecondView ) {

		aspect *= 0.5;

	}
	orthoCamera.left = - aspect * scale;
	orthoCamera.right = aspect * scale;
	orthoCamera.bottom = - scale;
	orthoCamera.top = scale;
	orthoCamera.near = camera.near;
	orthoCamera.far = camera.far;
	orthoCamera.updateProjectionMatrix();

}

function animate() {

	requestAnimationFrame( animate );

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.errorThreshold = params.errorThreshold;
	tiles.optimizeRaycast = params.optimizeRaycast;
	tiles.stopAtEmptyTiles = params.stopAtEmptyTiles;
	tiles.displayActiveTiles = params.displayActiveTiles;
	tiles.maxDepth = params.maxDepth;

	// update plugin
	const plugin = tiles.getPluginByName( 'DEBUG_TILES_PLUGIN' );
	plugin.displayBoxBounds = params.displayBoxBounds;
	plugin.displaySphereBounds = params.displaySphereBounds;
	plugin.displayRegionBounds = params.displayRegionBounds;
	plugin.colorMode = parseFloat( params.colorMode );

	if ( params.orthographic ) {

		tiles.deleteCamera( camera );
		tiles.setCamera( orthoCamera );
		tiles.setResolutionFromRenderer( orthoCamera, renderer );

	} else {

		tiles.deleteCamera( orthoCamera );
		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );

	}

	if ( params.showSecondView ) {

		tiles.setCamera( secondCamera );
		tiles.setResolutionFromRenderer( secondCamera, secondRenderer );

	} else {

		tiles.deleteCamera( secondCamera );

	}

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

	// update tiles center
	if ( tiles.getBoundingBox( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	} else if ( tiles.getBoundingSphere( sphere ) ) {

		tiles.group.position.copy( sphere.center );
		tiles.group.position.multiplyScalar( - 1 );

	}

	if ( parseFloat( params.raycast ) !== NONE && lastHoveredElement !== null ) {

		if ( lastHoveredElement === renderer.domElement ) {

			raycaster.setFromCamera( mouse, params.orthographic ? orthoCamera : camera );

		} else {

			raycaster.setFromCamera( mouse, secondCamera );

		}

		raycaster.firstHitOnly = parseFloat( params.raycast ) === FIRST_HIT_ONLY;

		const results = raycaster.intersectObject( tiles.group, true );
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

	// update tiles
	window.tiles = tiles;
	if ( params.enableUpdate ) {

		secondCamera.updateMatrixWorld();
		camera.updateMatrixWorld();
		orthoCamera.updateMatrixWorld();
		tiles.update();

	}

	render();
	stats.update();

}

function render() {

	updateOrthoCamera();

	cameraHelper.visible = false;
	orthoCameraHelper.visible = false;
	secondCameraHelper.visible = false;

	// render primary view
	if ( params.orthographic ) {

		const dist = orthoCamera.position.distanceTo( rayIntersect.position );
		rayIntersect.scale.setScalar( dist / 150 );

	} else {

		const dist = camera.position.distanceTo( rayIntersect.position );
		rayIntersect.scale.setScalar( dist * camera.fov / 6000 );

	}
	renderer.render( scene, params.orthographic ? orthoCamera : camera );

	// render secondary view
	if ( params.showSecondView ) {

		const dist = secondCamera.position.distanceTo( rayIntersect.position );
		rayIntersect.scale.setScalar( dist * secondCamera.fov / 6000 );
		secondRenderer.render( scene, secondCamera );

	}

	// render third person view
	thirdPersonRenderer.domElement.style.visibility = params.showThirdPerson ? 'visible' : 'hidden';
	if ( params.showThirdPerson ) {

		cameraHelper.update();
		cameraHelper.visible = ! params.orthographic;

		orthoCameraHelper.update();
		orthoCameraHelper.visible = params.orthographic;

		if ( params.showSecondView ) {

			secondCameraHelper.update();
			secondCameraHelper.visible = true;

		}

		const dist = thirdPersonCamera.position.distanceTo( rayIntersect.position );
		rayIntersect.scale.setScalar( dist * thirdPersonCamera.fov / 6000 );
		thirdPersonRenderer.render( scene, thirdPersonCamera );

	}

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
