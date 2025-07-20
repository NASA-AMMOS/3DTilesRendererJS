
import { GlobeControls, TilesRenderer, CAMERA_FRAME, EnvironmentControls } from '3d-tiles-renderer';
import { Scene, WebGLRenderer, PerspectiveCamera, MathUtils, Sphere, TextureUtils } from 'three';
import { estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as Cesium from 'cesium';

const url = '../data/tileset.json';
const threeContainer = document.getElementById( 'three-container' );
const cesiumContainer = document.getElementById( 'cesium-container' );
const threeStats = threeContainer.getElementsByClassName( 'stats' )[ 0 ];
const cesiumStats = cesiumContainer.getElementsByClassName( 'stats' )[ 0 ];
let cesiumViewer, threeViewer;
let cameraInitialized = false;

( async () => {

	await initThree();
	await initCesium();

	window.addEventListener( 'keydown', e => {

		if ( e.key === ' ' ) {

			document.body.classList.toggle( 'fullscreen' );

		}

	} );

	updateFromHash();
	setInterval( () => {

		const { camera } = threeViewer;
		const { position, rotation } = camera;
		const data = [ ...position, rotation.x, rotation.y, rotation.z ].map( v => parseFloat( v.toFixed( 4 ) ) );
		window.history.replaceState( undefined, undefined, `#${ JSON.stringify( data ) }` );

	}, 100 );

	render();

} )();

function updateFromHash() {

	const hash = window.location.hash.replace( /^#/, '' );
	if ( ! hash ) return;

	const [ x, y, z, ex, ey, ez ] = JSON.parse( unescape( hash ) );

	const { camera } = threeViewer;
	camera.position.set( x, y, z );
	camera.rotation.set( ex, ey, ez );
	cameraInitialized = true;

}

function render() {

	requestAnimationFrame( render );

	window.THREE_DATA = threeViewer;
	window.CESIUM_DATA = cesiumViewer;

	// update three
	threeViewer.update();

	// update cesium
	const ellipsoid = threeViewer.tiles.ellipsoid;
	const frame = ellipsoid.getCartographicFromObjectFrame( threeViewer.camera.matrixWorld, {}, CAMERA_FRAME );

	// update frustum
	cesiumViewer.camera.frustum.near = threeViewer.camera.near;
	cesiumViewer.camera.frustum.far = threeViewer.camera.far;
	cesiumViewer.camera.frustum.fov = vertFovToCesiumFov( threeViewer.camera.fov, threeViewer.camera.aspect ) * MathUtils.DEG2RAD;

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
	let textureBytes, geometryBytes;

	// update three stats
	loadedGeometryTiles = 0;
	textureBytes = 0;
	geometryBytes = 0;
	threeViewer.tiles.forEachLoadedModel( ( scene, tile ) => {

		loadedGeometryTiles ++;

		scene.traverse( c => {

			const { geometry, material } = c;
			if ( geometry ) {

				geometryBytes += estimateBytesUsed( c.geometry );
				for ( const key in material ) {

					const value = material[ key ];
					if ( value && value.isTexture ) {

						const { format, type, image } = value;
						const { width, height } = image;

						let bytes = TextureUtils.getByteLength( width, height, format, type );
						bytes *= value.generateMipmaps ? 4 / 3 : 1;
						textureBytes += bytes;

					}

				}

			}

		} );

	} );

	shallowTilesLoaded = 0;
	traverse( threeViewer.root, t => {

		if ( t.__hasRenderableContent ) {

			shallowTilesLoaded ++;
			return true;

		}

	} );

	allLoadedTiles = 0;
	traverse( threeViewer.root, ( t, d ) => {

		if ( t.__hasContent && t.__loadingState !== 0 ) {

			allLoadedTiles ++;

		}

	} );

	clearStats( threeStats );
	writeStats( threeStats, 'visible tiles', threeViewer.tiles.visibleTiles.size );
	writeStats( threeStats, 'loaded tiles', allLoadedTiles );
	writeStats( threeStats, 'loaded geom tiles', loadedGeometryTiles );
	writeStats( threeStats, 'loaded subtree tiles', allLoadedTiles - loadedGeometryTiles );
	writeStats( threeStats, 'loaded layer 1 tiles', shallowTilesLoaded );
	writeStats( threeStats, 'total memory', ( threeViewer.tiles.lruCache.cachedBytes * 1e-6 ).toFixed( 3 ) + ' MB' );
	writeStats( threeStats, 'geometry memory', ( geometryBytes * 1e-6 ).toFixed( 3 ) + ' MB' );
	writeStats( threeStats, 'texture memory', ( textureBytes * 1e-6 ).toFixed( 3 ) + ' MB' );

	// update cesium stats

	shallowTilesLoaded = 0;
	traverse( cesiumViewer.root, t => {

		if ( t._content && t._content.ready && t._content._model ) {

			shallowTilesLoaded ++;
			return true;

		}

	} );

	allLoadedTiles = 0;
	geometryBytes = 0;
	textureBytes = 0;
	traverse( cesiumViewer.root, t => {

		if ( t._content && t._content.ready ) {

			allLoadedTiles ++;

			if ( t._content._model ) {

				geometryBytes += t._content._model.statistics.geometryByteLength;
				textureBytes += t._content._model.statistics.texturesByteLength;

			}

		}

	} );

	clearStats( cesiumStats );
	writeStats( cesiumStats, 'visible tiles', cesiumViewer.tiles.statistics.selected );
	writeStats( cesiumStats, 'loaded tiles', allLoadedTiles );
	writeStats( cesiumStats, 'loaded geom tiles', cesiumViewer.tiles.statistics.numberOfTilesWithContentReady );
	writeStats( cesiumStats, 'loaded subtree tiles', allLoadedTiles - cesiumViewer.tiles.statistics.numberOfTilesWithContentReady );
	writeStats( cesiumStats, 'loaded layer 1 tiles', shallowTilesLoaded );
	writeStats( cesiumStats, 'total memory', ( cesiumViewer.tiles.totalMemoryUsageInBytes * 1e-6 ).toFixed( 3 ) + ' MB' );
	writeStats( cesiumStats, 'geometry memory', ( geometryBytes * 1e-6 ).toFixed( 3 ) + ' MB' );
	writeStats( cesiumStats, 'texture memory', ( textureBytes * 1e-6 ).toFixed( 3 ) + ' MB' );

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

	let controls;
	tiles.addEventListener( 'load-tile-set', () => {

		// position the camera based on the model
		const sphere = new Sphere();
		tiles.getBoundingSphere( sphere );

		if ( sphere.center.distanceTo( camera.position ) > sphere.radius * 20 ) {

			cameraInitialized = false;

		}

		if ( ! cameraInitialized ) {

			cameraInitialized = true;
			camera.position.copy( sphere.center );

			if ( camera.position.length() > 1e5 ) {

				const offset = sphere.center.clone().normalize();
				camera.position.addScaledVector( offset, sphere.radius );

			} else {

				camera.position.x += sphere.radius;
				camera.position.y += sphere.radius;
				camera.position.z += sphere.radius;

			}

			camera.lookAt( sphere.center );

		}

		if ( camera.position.length() > 1e5 ) {

			// controls
			controls = new GlobeControls( scene, camera, renderer.domElement, null );
			controls.enableDamping = true;
			controls.adjustHeight = false;
			controls.setEllipsoid( tiles.ellipsoid, tiles.group );

		} else {

			controls = new EnvironmentControls( scene, camera, renderer.domElement, null );
			controls.enableDamping = true;
			controls.adjustHeight = false;

		}



	} );

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

		onWindowResize();

		if ( controls ) {

			controls.update();

		}

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

	// extract the quaternion
	const camera = viewer.camera;

	// log the camera information for debugging
	// const { latitude, longitude, height } = camera.positionCartographic;
	// console.log( {
	// 	fov: camera.frustum.fov,
	// 	near: camera.frustum.near,
	// 	far: camera.frustum.far,

	// 	roll: camera.roll,
	// 	pitch: camera.pitch,
	// 	heading: camera.heading,

	// 	latitude,
	// 	longitude,
	// 	height,
	// } );

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

function vertFovToCesiumFov( fov, aspect ) {

	if ( aspect < 1 ) return fov;

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
