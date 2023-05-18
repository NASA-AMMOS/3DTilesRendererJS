import { DebugTilesRenderer as TilesRenderer } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	CameraHelper,
	Vector3,
	Quaternion,
	Group,
	sRGBEncoding,
	Matrix4,
	Box3,
	Sphere,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const apiOrigin = 'https://tile.googleapis.com';

const hashUrl = window.location.hash.replace( /^#/, '' );
let camera, controls, scene, renderer, tiles, cameraHelper;
let offsetParent;
let statsContainer, stats;

const params = {

	'enableUpdate': true,
	'enableCacheDisplay': false,
	'enableRendererStats': false,

	'apiKey': 'put-your-google-api-key-here',
	'errorTarget': 6,
	'maxDepth': 15,
	'loadSiblings': true,
	'stopAtEmptyTiles': true,
	'resolutionScale': 1.0,

	'displayBoxBounds': false,
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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1600000 );
	camera.position.set( 7326000, 10279000, -823000 );
	cameraHelper = new CameraHelper( camera );
	scene.add( cameraHelper );

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

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

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
	tileOptions.add( params, 'maxDepth' ).min( 1 ).max( 100 );
	tileOptions.add( params, 'up', [ '+Y', '+Z', '-Z' ] );

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'displayBoxBounds' );

	const exampleOptions = gui.addFolder( 'Example Options' );
	exampleOptions.add( params, 'enableUpdate' ).onChange( v => {

		tiles.parseQueue.autoUpdate = v;
		tiles.downloadQueue.autoUpdate = v;

		if ( v ) {

			tiles.parseQueue.scheduleJobRun();
			tiles.downloadQueue.scheduleJobRun();

		}

	} );
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

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.loadSiblings = params.loadSiblings;
	tiles.stopAtEmptyTiles = params.stopAtEmptyTiles;
	tiles.displayActiveTiles = params.displayActiveTiles;
	tiles.maxDepth = params.maxDepth;
	tiles.displayBoxBounds = params.displayBoxBounds;
	tiles.colorMode = parseFloat( params.colorMode );

	// TODO: required every raf?
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	offsetParent.updateMatrixWorld( true );

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
