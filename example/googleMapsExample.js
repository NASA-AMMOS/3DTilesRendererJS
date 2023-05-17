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
	CameraHelper,
	Raycaster,
	Vector2,
	Vector3,
	Quaternion,
	Mesh,
	CylinderBufferGeometry,
	MeshBasicMaterial,
	Group,
	TorusBufferGeometry,
	sRGBEncoding,
	Matrix4,
	Box3,
	Sphere,
	SphereGeometry,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const ALL_HITS = 1;
const FIRST_HIT_ONLY = 2;

const apiOrigin = 'https://tile.googleapis.com';

const hashUrl = window.location.hash.replace( /^#/, '' );
let camera, controls, scene, renderer, tiles, cameraHelper;
let raycaster, mouse, rayIntersect, lastHoveredElement;
let offsetParent;
let statsContainer, stats;

const params = {

	'enableUpdate': true,
	'raycast': NONE,
	'enableCacheDisplay': false,
	'enableRendererStats': false,

	'apiKey': 'put-your-google-api-key-here',
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
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.123.0/examples/js/libs/draco/gltf/' );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );

	tiles.manager.addHandler( /\.gltf$/, loader );
	offsetParent.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

}

function isInt( input ) {

	return ( typeof input === 'string' ) ? ! isNaN( input ) && ! isNaN( parseFloat( input ) ) && Number.isInteger( parseFloat( input ) ) : Number.isInteger( input );

}

function reinstantiateTiles() {

	let url = hashUrl || '../data/tileset.json';

	if ( hashUrl ) {

		params.ionAssetId = isInt( hashUrl ) ? hashUrl : '';

	}

	if ( tiles ) {

		offsetParent.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	url = new URL( `${apiOrigin}/v1/3dtiles/root.json?key=${ params.apiKey }` );

	fetch( url, { mode: 'cors' } )
		.then( ( res ) => {

			if ( res.ok ) {

				return res.json();

			} else {

				return Promise.reject( `${res.status} : ${res.statusText}` );

			}

		} )
		.then( ( json ) => {

			if ( !json.root ) {
				throw new Error( `malformed response: ${ json }` );
			}

			// TODO: check this is correct
			// find first node with uri and treat that as root
			let uri = undefined;
			const toVisit = [];
			for ( let curr = json.root; curr !== undefined; curr = toVisit.pop() ) {
				if ( curr.content?.uri ) {
					uri = new URL( `${ apiOrigin }${ curr.content.uri }` );
					uri.searchParams.append( 'key', params.apiKey );
					break;
				}

				toVisit.push( ...curr.children );
			}

			if ( !uri ) {
				throw new Error( `can't find session string in response: ${ json }` );
			}

			const session = uri.searchParams.get( 'session' );
			console.log('session', session);

			tiles = new TilesRenderer( url.toString() );

			tiles.preprocessURL = uri => {

				uri = new URL( uri );
				if ( /^http/.test( uri.protocol ) ) {

					uri.searchParams.append( 'session', session );
					uri.searchParams.append( 'key', params.apiKey );

				}
				return uri.toString();

			};

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

			tiles.lruCache.minSize = 3000;
			tiles.lruCache.maxSize = 5000;

			setupTiles();

			} )
			.catch( err => {

				console.error( 'Unable to get gmaps tileset:', err );

			} );

}

function init() {
	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	renderer.outputEncoding = sRGBEncoding;

	document.body.appendChild( renderer.domElement );
	renderer.domElement.tabIndex = 1;

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 16000000 );
	camera.position.set( 7326000, 10279000, -823000 );
	cameraHelper = new CameraHelper( camera );
	scene.add( cameraHelper );

	const geom = new SphereGeometry(1, 32, 8);
	const mat = new MeshBasicMaterial( { color: 0xff0000 } );
	const mesh = new Mesh(geom, mat);
	mesh.position.x = 4;
	scene.add(mesh);

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.enablePan = false;
	controls.minDistance = 6500000;
	controls.maxDistance = 13315000;

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
	const rayMesh = new Mesh( new CylinderBufferGeometry( 0.25, 0.25, 6 ), rayIntersectMat );
	rayMesh.rotation.x = Math.PI / 2;
	rayMesh.position.z += 3;
	rayIntersect.add( rayMesh );

	const rayRing = new Mesh( new TorusBufferGeometry( 1.5, 0.2, 16, 100 ), rayIntersectMat );
	rayIntersect.add( rayRing );
	scene.add( rayIntersect );
	rayIntersect.visible = false;

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
	renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
	renderer.domElement.addEventListener( 'mouseup', onMouseUp, false );
	renderer.domElement.addEventListener( 'mouseleave', onMouseLeave, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const ionOptions = gui.addFolder( 'gmaps' );
	ionOptions.add( params, 'apiKey' );
	ionOptions.add( params, 'reload' );
	ionOptions.open();

	const tileOptions = gui.addFolder( 'Tiles Options' );
	tileOptions.add( params, 'loadSiblings' );
	tileOptions.add( params, 'stopAtEmptyTiles' );
	tileOptions.add( params, 'displayActiveTiles' );
	tileOptions.add( params, 'errorTarget' ).min( 0 ).max( 50 );
	tileOptions.add( params, 'errorThreshold' ).min( 0 ).max( 1000 );
	tileOptions.add( params, 'maxDepth' ).min( 1 ).max( 100 );
	tileOptions.add( params, 'up', [ '+Y', '+Z', '-Z' ] );

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'colorMode', {

		NONE,
		SCREEN_ERROR,
		GEOMETRIC_ERROR,
		DISTANCE,
		DEPTH,
		RELATIVE_DEPTH,
		IS_LEAF,
		RANDOM_COLOR,

	} );

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
	exampleOptions.add( params, 'enableCacheDisplay' );
	exampleOptions.add( params, 'enableRendererStats' );

	gui.open();

	statsContainer = document.createElement( 'div' );
	document.getElementById( 'info' ).appendChild( statsContainer );

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

function onMouseLeave( e ) {

	lastHoveredElement = null;

}

function onMouseMove( e ) {

	const bounds = this.getBoundingClientRect();
	mouse.x = e.clientX - bounds.x;
	mouse.y = e.clientY - bounds.y;
	mouse.x = ( mouse.x / bounds.width ) * 2 - 1;
	mouse.y = - ( mouse.y / bounds.height ) * 2 + 1;

	lastHoveredElement = this;

}

const startPos = new Vector2();
const endPos = new Vector2();
function onMouseDown( e ) {

	const bounds = this.getBoundingClientRect();
	startPos.set( e.clientX - bounds.x, e.clientY - bounds.y );

}

function onMouseUp( e ) {

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

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.errorThreshold = params.errorThreshold;
	tiles.loadSiblings = params.loadSiblings;
	tiles.stopAtEmptyTiles = params.stopAtEmptyTiles;
	tiles.displayActiveTiles = params.displayActiveTiles;
	tiles.maxDepth = params.maxDepth;
	tiles.displayBoxBounds = params.displayBoxBounds;
	tiles.colorMode = parseFloat( params.colorMode );

	// TODO: required every raf?
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	offsetParent.rotation.set( 0, 0, 0 );
	if ( params.up === '-Z' ) {

		offsetParent.rotation.x = Math.PI / 2;

	} else if ( params.up === '+Z' ) {

		offsetParent.rotation.x = - Math.PI / 2;

	}

	offsetParent.updateMatrixWorld( true );

	if ( parseFloat( params.raycast ) !== NONE && lastHoveredElement !== null ) {

		if ( lastHoveredElement === renderer.domElement ) {

			raycaster.setFromCamera( mouse, camera );

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

		camera.updateMatrixWorld();
		tiles.update();

	}

	render();
	stats.update();

}

function render() {

	cameraHelper.visible = false;

	// render primary view
	const dist = camera.position.distanceTo( rayIntersect.position );
	rayIntersect.scale.setScalar( dist * camera.fov / 6000 );

	renderer.render( scene, camera );

	const cacheFullness = tiles.lruCache.itemList.length / tiles.lruCache.maxSize;
	let str = `Downloading: ${ tiles.stats.downloading } Parsing: ${ tiles.stats.parsing } Visible: ${ tiles.group.children.length - 2 }`;

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
