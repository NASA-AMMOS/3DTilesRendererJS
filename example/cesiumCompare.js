
import { GlobeControls, TilesRenderer, CAMERA_FRAME } from '3d-tiles-renderer';
import { Scene, WebGLRenderer, PerspectiveCamera, MathUtils } from 'three';
import * as Cesium from 'cesium';

const url = new URL( './local-data/photography/tileset.json', import.meta.url ).toString();
const threeContainer = document.getElementById( 'three-container' );
const cesiumContainer = document.getElementById( 'cesium-container' );
const threeStats = threeContainer.getElementsByClassName( 'stats' )[ 0 ];
const cesiumStats = cesiumContainer.getElementsByClassName( 'stats' )[ 0 ];
let cesiumViewer, threeViewer;

( async () => {

	await initThree();
	await initCesium();
	render();

} )();

// TODO: position the tile set in a reliable position to ensure visibility - eg at lat/lon 0/0
// TODO: add ability to refresh to the same position

function render() {

	requestAnimationFrame( render );

	// update three
	threeViewer.update();

	// update cesium
	const ellipsoid = threeViewer.tiles.ellipsoid;
	const frame = ellipsoid.getCartographicFromObjectFrame( threeViewer.camera.matrixWorld, {}, CAMERA_FRAME );

	// update frustum
	cesiumViewer.camera.frustum.near = threeViewer.camera.near;
	cesiumViewer.camera.frustum.far = threeViewer.camera.far;
	cesiumViewer.camera.frustum.fov = vertFovToHoriz( threeViewer.camera.fov, threeViewer.camera.aspect ) * MathUtils.DEG2RAD;



	// set position
	cesiumViewer.camera.position.x = threeViewer.camera.position.x;
	cesiumViewer.camera.position.y = threeViewer.camera.position.y;
	cesiumViewer.camera.position.z = threeViewer.camera.position.z;

	// set rotation
	cesiumViewer.camera.setView( {
		destination: cesiumViewer.position,
		orientation: {
			roll: frame.roll,
			pitch: frame.elevation,
			heading: frame.azimuth,
		}
	} );

	cesiumViewer.update();

	let shallowTilesLoaded, loadedGeometryTiles, allLoadedTiles;

	// update three stats
	loadedGeometryTiles = 0;
	threeViewer.tiles.forEachLoadedModel( ( scene, tile ) => {

		loadedGeometryTiles ++;

	} );

	shallowTilesLoaded = 0;
	traverse( threeViewer.root, t => {

		if ( t.__hasRenderableContent ) {

			shallowTilesLoaded ++;
			return true;

		}

	} );

	allLoadedTiles = 0;
	traverse( threeViewer.root, t => {

		if ( t.__hasContent && t.__loadingState !== 0 ) {

			allLoadedTiles ++;

		}

	} );

	clearStats( threeStats );
	writeStats( threeStats, 'visible tiles', threeViewer.tiles.visibleTiles.size );
	writeStats( threeStats, 'loaded tiles', allLoadedTiles );
	writeStats( threeStats, 'loaded geom tiles', allLoadedTiles - loadedGeometryTiles );
	writeStats( threeStats, 'loaded subtree tiles', loadedGeometryTiles );
	writeStats( threeStats, 'loaded layer 1 tiles', shallowTilesLoaded );
	writeStats( threeStats, 'memory', ( threeViewer.tiles.lruCache.cachedBytes * 1e-6 ).toFixed( 3 ) + 'MB' );

	// update cesium stats

	shallowTilesLoaded = 0;
	traverse( cesiumViewer.root, t => {

		if ( t._content && t._content.ready && t._content._model ) {

			shallowTilesLoaded ++;
			return true;

		}

	} );

	allLoadedTiles = 0;
	traverse( cesiumViewer.root, t => {

		if ( t._content && t._content.ready ) {

			allLoadedTiles ++;

		}

	} );

	window.ROOT = cesiumViewer.root;
	clearStats( cesiumStats );
	writeStats( cesiumStats, 'visible tiles', cesiumViewer.tiles.statistics.selected );
	writeStats( cesiumStats, 'loaded tiles', allLoadedTiles );
	writeStats( cesiumStats, 'loaded geom tiles', cesiumViewer.tiles.statistics.numberOfTilesWithContentReady );
	writeStats( cesiumStats, 'loaded subtree tiles', allLoadedTiles - cesiumViewer.tiles.statistics.numberOfTilesWithContentReady );
	writeStats( cesiumStats, 'loaded shallow tiles', shallowTilesLoaded );
	writeStats( cesiumStats, 'memory', ( cesiumViewer.tiles.totalMemoryUsageInBytes * 1e-6 ).toFixed( 3 ) + 'MB' );

}

async function initThree() {

	// renderer
	const renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0 );
	threeContainer.appendChild( renderer.domElement );

	// adjustments to match cesium defaults
	renderer.domElement.style.imageRendering = 'pixelated';
	renderer.setPixelRatio( 1 );
	// renderer.setPixelRatio( window.devicePixelRatio );

	// scene
	const scene = new Scene();

	// camera
	const aspect = window.innerWidth / window.innerHeight;
	const cesiumFov = 60;
	const camera = new PerspectiveCamera( horizFovToVert( cesiumFov, aspect ), aspect, 0.1, 1e10 );
	camera.position.set( - 1356736.6495227425, 5298502.86925096, 3271193.9085458643 );
	camera.quaternion.set(
		0.27330445532852865,
		- 0.4460582045331912,
		- 0.821679716911258,
		0.2262281938283491,
	);

	// initialize tiles
	const tiles = new TilesRenderer( url );
	tiles.preprocessURL = url => unescape( url );
	tiles.lruCache.maxBytesSize = Infinity;
	tiles.lruCache.minBytesSize = 0;
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setCamera( camera );

	scene.add( tiles.group );

	// position the camera
	const lat = 0.5419733570174874;
	const lon = 1.821470691863346;
	const height = 553.1228538149635;

	const roll = 0;
	const pitch = - 0.5000321680050197;
	const heading = 0;

	tiles.ellipsoid
		.getObjectFrame(
			lat, lon, height,
			roll, pitch, heading,
			camera.matrixWorld,
			CAMERA_FRAME,
		).decompose(
			camera.position,
			camera.quaternion,
			camera.scale,
		);

	// controls
	const controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;
	controls.adjustHeight = false;
	controls.setEllipsoid( tiles.ellipsoid, tiles.group );

	// resize listeners
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	threeViewer = {
		tiles,
		camera,
		renderer,
		scene,
		update,
		get root() {

			return tiles.root;

		},
	};

	function onWindowResize() {

		const cesiumFov = 60;
		const element = renderer.domElement;
		const aspect = element.clientWidth / element.clientHeight;
		camera.aspect = aspect;
		camera.fov = horizFovToVert( cesiumFov, aspect );
		camera.updateProjectionMatrix();

		renderer.setSize( element.clientWidth, element.clientHeight, false );

	}

	function update() {

		controls.update();

		// update options
		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.setCamera( camera );

		// update tiles
		camera.updateMatrixWorld();
		tiles.update();

		renderer.render( scene, camera );

	}

}

async function initCesium() {

	// initialize the viewer
	const viewer = new Cesium.CesiumWidget( cesiumContainer );
	viewer.scene.terrainProvider = false;
	viewer.scene.skyBox.destroy();
	viewer.scene.skyBox = undefined;
	viewer.scene.sun.destroy();
	viewer.scene.sun = undefined;
	viewer.scene.backgroundColor = Cesium.Color.BLACK.clone();
	viewer.creditDisplay.container.style.display = 'none';

	// initialize the tile set
	const tileset = await Cesium.Cesium3DTileset.fromUrl( url, {
		loadSiblings: true,
		maximumCacheOverflowBytes: 1e20,
		cacheBytes: 0,
	} );
	viewer.scene.primitives.add( tileset );

	// position the camera
	await viewer.zoomTo( tileset );

	// extract the quaternion
	const camera = viewer.camera;
	const { latitude, longitude, height } = camera.positionCartographic;
	console.log( {
		fov: camera.frustum.fov,
		near: camera.frustum.near,
		far: camera.frustum.far,

		roll: camera.roll,
		pitch: camera.pitch,
		heading: camera.heading,

		latitude,
		longitude,
		height,
	} );

	cesiumViewer = {
		tiles: tileset,
		viewer,
		camera,
		scene: viewer.scene,
		update: () => {},
		get root() {

			let node = tileset._selectedTiles[ 0 ];
			while ( node && node.parent ) node = node.parent;
			return node || null;

		},
	};

}

function clearStats( target ) {

	target.innerHTML = '';

}

function writeStats( target, key, value ) {

	target.innerHTML += `<div name="${ key }">${ value }</div>`;

}

function horizFovToVert( fov, aspect ) {

	return MathUtils.RAD2DEG * 2 * Math.atan( Math.tan( MathUtils.DEG2RAD * fov / 2 ) / aspect );

}

function vertFovToHoriz( fov, aspect ) {

	return MathUtils.RAD2DEG * 2 * Math.atan( Math.tan( MathUtils.DEG2RAD * fov / 2 ) * aspect );

}

function traverse( root, callback, depth = 0 ) {

	if ( root ) {

		if ( ! callback( root, depth ) && root.children ) {

			root.children.forEach( c => {

				traverse( c, callback, depth + 1 );

			} );

		}

	}

}
