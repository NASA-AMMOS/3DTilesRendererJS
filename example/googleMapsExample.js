import { Ellipsoid, DebugTilesRenderer as TilesRenderer } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Vector3,
	Group,
	sRGBEncoding,
	Raycaster,
	Vector2,
	MeshPhongMaterial,
	SphereGeometry,
	MeshBasicMaterial,
	Mesh,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { GlobeOrbitControls } from './GlobeOrbitControls.js';
import { WGS84_RADIUS, WGS84_HEIGHT } from '../src/base/constants.js';
import { EllipsoidRegionHelper } from '../src/index.js';
import { MapsTilesCredits } from './src/MapsTilesCredits.js';
import { GeoCoord } from './src/GeoCoord.js';

const apiOrigin = 'https://tile.googleapis.com';

let camera, controls, scene, renderer, tiles, credits;
let statsContainer, stats;

const ellipsoid = new Ellipsoid( WGS84_RADIUS, WGS84_RADIUS, WGS84_HEIGHT );
let ellipsoidHelper, ellipsoidInitialised = false;
let surfaceHelper;

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const pointer = new Vector2();
const deltaTarget = new Vector3();
const geocoord = new GeoCoord();

let prevDist = 0;

const params = {

	'showGlobeHelper': false,
	'showFrustumHelper': false,
	'showSurfaceHelper': false,

	'enableUpdate': true,
	'enableCacheDisplay': false,
	'enableRendererStats': false,

	'apiKey': 'put-your-api-key-here',
	'errorTarget': 6,
	'errorThreshold': Infinity,
	'maxDepth': Infinity,
	'loadSiblings': true,
	'stopAtEmptyTiles': true,
	'resolutionScale': 1.0,

	'autoDisableRendererCulling': true,
	'displayActiveTiles': false,
	'displayBoxBounds': false,
	'displaySphereBounds': false,
	'displayRegionBounds': false,
	'reload': reinstantiateTiles,

};

init();
animate();

function setupTiles() {

	tiles.fetchOptions.mode = 'cors';

	// Note the DRACO compression files need to be supplied via an explicit source.
	// We use unpkg here but in practice should be provided by the application.
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.123.0/examples/js/libs/draco/gltf/' );

	const loader = new GLTFLoader( tiles.manager );
	loader.setDRACOLoader( dracoLoader );

	tiles.manager.addHandler( /\.gltf$/, loader );
	scene.add( tiles.group );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

}

function reinstantiateTiles() {

	if ( tiles ) {

		scene.remove( tiles.group );
		tiles.dispose();
		tiles = null;

	}

	const url = new URL( `${apiOrigin}/v1/3dtiles/root.json?key=${ params.apiKey }` );

	fetch( url, { mode: 'cors' } )
		.then( res => {

			if ( res.ok ) {

				return res.json();

			} else {

				return Promise.reject( new Error( `${res.status} : ${res.statusText}` ) );

			}

		} )
		.then( json => {

			if ( ! json.root ) {

				throw new Error( `malformed response: ${ json }` );

			}

			// TODO: See if there's a better way to retrieve the session id
			let uri;
			const toVisit = [ json.root ];
			while ( toVisit.length !== 0 ) {

				const curr = toVisit.pop();
				if ( curr.content && curr.content.uri ) {

					uri = new URL( `${ apiOrigin }${ curr.content.uri }` );
					uri.searchParams.append( 'key', params.apiKey );
					break;

				} else {

					toVisit.push( ...curr.children );

				}

			}

			if ( ! uri ) {

				throw new Error( `can't find session string in response: ${ json }` );

			}

			const session = uri.searchParams.get( 'session' );

			tiles = new TilesRenderer( url.toString() );
			tiles.preprocessURL = uri => {

				uri = new URL( uri );
				if ( /^http/.test( uri.protocol ) ) {

					uri.searchParams.append( 'session', session );
					uri.searchParams.append( 'key', params.apiKey );

				}
				return uri.toString();

			};

			credits = new MapsTilesCredits();
			tiles.onTileVisibilityChange = ( scene, tile, visible ) => {

				const copyright = tile.cached.metadata.asset.copyright || '';
				if ( visible ) credits.addCredits( copyright );
				else credits.removeCredits( copyright );


			};

			tiles.lruCache.minSize = 3000;
			tiles.lruCache.maxSize = 5000;
			tiles.group.rotation.x = - Math.PI / 2;

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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );
	camera.position.set( 7326000, 10279000, - 823000 );

	// controls
	controls = new GlobeOrbitControls( camera, ellipsoid, renderer.domElement );
	controls.minDistance = 100;
	controls.maxDistance = Infinity;

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// ellipsoid helper
	ellipsoidHelper = new EllipsoidRegionHelper( ellipsoid );
	ellipsoidHelper.material = new MeshPhongMaterial( { color: 0xff3311 } );
	ellipsoidHelper.visible = false;
	scene.add( ellipsoidHelper );

	// misc helper
	const geom = new SphereGeometry( 1, 32, 16 );
	const mat = new MeshBasicMaterial( { color: 0x0000ff } );
	surfaceHelper = new Mesh( geom, mat );
	surfaceHelper.visible = false;
	scene.add( surfaceHelper );

	// GUI
	const gui = new GUI();
	gui.width = 300;

	const displayOptions = gui.addFolder( 'Display' );
	displayOptions.add( params, 'showGlobeHelper' ).onChange( v => ellipsoidHelper.visible = v );
	displayOptions.add( params, 'showSurfaceHelper' ).onChange( v => surfaceHelper.visible = v );
	displayOptions.open();

	const mapsOptions = gui.addFolder( 'GMaps' );
	mapsOptions.add( params, 'apiKey' );
	mapsOptions.add( params, 'reload' );
	mapsOptions.open();

	const tileOptions = gui.addFolder( 'Tiles Options' );
	tileOptions.add( params, 'loadSiblings' );
	tileOptions.add( params, 'stopAtEmptyTiles' );
	tileOptions.add( params, 'errorTarget' ).min( 0 ).max( 50 );
	tileOptions.add( params, 'errorThreshold' );
	tileOptions.add( params, 'maxDepth' );

	const debug = gui.addFolder( 'Debug Options' );
	debug.add( params, 'displayBoxBounds' );
	debug.add( params, 'displaySphereBounds' );
	debug.add( params, 'displayRegionBounds' );

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

	document.addEventListener( 'dblclick', event => {

		if ( raycaster ) {

			pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
			pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

			raycaster.setFromCamera( pointer, camera );
			const intersections = raycaster.intersectObject( tiles.group, true );
			const numIntersections = intersections.length;
			if ( numIntersections > 0 ) {

				const intersection = intersections[ 0 ];

				deltaTarget.subVectors( intersection.point, controls.target );
				controls.target.add( deltaTarget );
				// TODO: work out how to adjust the camera position so this refocussing
				//       happens seamlessly (i.e. on a mousemove callback)
				// controls.position.add( deltaTarget );

			}

		}

	} );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio * params.resolutionScale );

}

const top = { origin: new Vector3( 0, 1000000000, 0 ), dir: new Vector3( 0, - 1, 0 ) };
const side = { origin: new Vector3( 1000000000, 0, 0 ), dir: new Vector3( - 1, 0, 0 ) };
const temp = new Vector3();

function refineEllipsoid() {

	const findSurface = ( query ) => {

		raycaster.set( query.origin, query.dir );
		const intersections = raycaster.intersectObject( tiles.group, true );
		const numIntersections = intersections.length;
		if ( numIntersections > 0 ) {

			const intersection = intersections[ 0 ];
			return intersection.point.length();

		} else {

			return undefined;

		}

	};

	const y = findSurface( top );
	const xz = findSurface( side );

	if ( y !== undefined && xz !== undefined ) {

		ellipsoid.radius.set( xz, y, xz );

		ellipsoid.getPositionToSurfacePoint( camera.position, temp );

		controls.target.copy( temp );

		ellipsoidHelper.update();
		ellipsoidInitialised = true;

	}

}

function updateFrustum( dist, raycast = false ) {

	// TODO: do we want to raycast like this or just do something simple based
	//       on surface distance?
	if ( raycast ) {

		const findSurfaceDistanceScreenSpace = ( x, y ) => {

			pointer.x = x;
			pointer.y = y;

			raycaster.setFromCamera( pointer, camera );
			const intersections = raycaster.intersectObject( tiles.group, true );
			const numIntersections = intersections.length;
			if ( numIntersections > 0 ) {

				const intersection = intersections[ 0 ];
				return intersection.distance;

			} else {

				return undefined;

			}

		};

		const casts = [];
		for ( const [ x, y ] of [[ - 1, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, - 1 ]] ) {

			const distance = findSurfaceDistanceScreenSpace( x, y );
			if ( distance !== undefined ) {

				camera.getWorldDirection( temp );
				casts.push( distance );

			}

		}

		camera.far = casts.length === 4 ? Math.max( ...casts ) : dist;

	} else {

		camera.far = dist * 2;

	}

	camera.updateProjectionMatrix();
	prevDist = dist;

}

function animate() {

	requestAnimationFrame( animate );

	if ( ! tiles ) return;

	if ( ! ellipsoidInitialised && raycaster ) {

		refineEllipsoid();

	}

	ellipsoid.getPositionToSurfacePoint( camera.position, temp );
	surfaceHelper.position.copy( temp );
	const surfaceDist = temp.distanceTo( camera.position );
	surfaceHelper.scale.setScalar( surfaceDist / 100 );

	// update options
	tiles.errorTarget = params.errorTarget;
	tiles.errorThreshold = params.errorThreshold;
	tiles.maxDepth = params.maxDepth;
	tiles.loadSiblings = params.loadSiblings;
	tiles.stopAtEmptyTiles = params.stopAtEmptyTiles;
	tiles.displayActiveTiles = params.displayActiveTiles;
	tiles.autoDisableRendererCulling = params.autoDisableRendererCulling;
	tiles.displayBoxBounds = params.displayBoxBounds;
	tiles.displaySphereBounds = params.displaySphereBounds;
	tiles.displayRegionBounds = params.displayRegionBounds;

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	if ( prevDist !== surfaceDist ) {

		updateFrustum( surfaceDist );

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

			// TODO: resurrect this
			count += 0;//BufferGeometryUtils.estimateBytesUsed( g );

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

	if ( credits ) {

		const mat = tiles.group.matrixWorld.clone().invert();
		const vec = camera.position.clone().applyMatrix4( mat );
		document.getElementById( 'credits' ).innerText = geocoord.fromVector3( vec ).toString() + '\n' + credits.getCredits();

	}

}
