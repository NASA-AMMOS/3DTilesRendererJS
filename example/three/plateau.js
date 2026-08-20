import {
	GlobeControls,
	TilesRenderer,
	CAMERA_FRAME,
	DEFAULT_LRU_CACHE,
	DEFAULT_DOWNLOAD_QUEUE,
	DEFAULT_PARSE_QUEUE,
} from '3d-tiles-renderer';
import {
	TilesFadePlugin,
	CesiumIonAuthPlugin,
	GLTFExtensionsPlugin,
	ImageOverlayPlugin,
	CesiumIonOverlay,
} from '3d-tiles-renderer/plugins';
import {
	Scene,
	WebGLRenderer,
	PerspectiveCamera,
	AmbientLight,
	DirectionalLight,
	MathUtils,
	Box3,
	Matrix4,
	Vector2,
	Vector3,
	Raycaster,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshBVHPlugin } from './src/plugins/MeshBVHPlugin.js';

// building attributes to display; anything missing from a tile's batch table is left out
const BUILDING_FIELDS = [
	{ key: 'gml:name', label: 'Name' },
	{ key: 'bldg:measuredheight', label: 'Height', format: v => `${ v } m` },
	{ key: 'bldg:storeysaboveground', label: 'Stories above' },
	{ key: 'bldg:storeysbelowground', label: 'Stories below' },
	{ key: 'bldg:usage', label: 'Usage code' },
	{ key: 'bldg:class', label: 'Class code' },
	{ key: 'Latitude', label: 'Latitude', format: v => toDegreesMinutesSeconds( v, 'N', 'S' ) },
	{ key: 'Longitude', label: 'Longitude', format: v => toDegreesMinutesSeconds( v, 'E', 'W' ) },
];

// world space anchor the panel points at: the top center of the building in an east north up frame
const buildingAnchorWorld = new Vector3();
const _buildingAnchor = new Vector3();
const _buildingBox = new Box3();
const _buildingVector = new Vector3();
const _enuFrame = new Matrix4();
const _localToEnuFrame = new Matrix4();
const _groupToLocal = new Matrix4();
const _cartographic = { lat: 0, lon: 0, height: 0 };
const _pointer = new Vector2();

// max pointer travel between press and release that still counts as a click, in css pixels
const CLICK_DRAG_THRESHOLD = 4;
const _pointerDown = new Vector2();
const _vector2 = new Vector2();

// caret height matching the stylesheet, and the gap between the caret tip and the building
const TOOLTIP_CARET_SIZE = 8;
const TOOLTIP_ANCHOR_GAP = 16;

let controls, scene, renderer, camera;
let terrainTiles, plateauTiles;

const params = {
	plateauErrorTarget: 16,
	terrainErrorTarget: 2,
};

// tints the selected building by comparing its batch id in the shader
function addBuildingHighlight( material ) {

	const highlightBatchId = { value: - 1 };
	material.userData.highlightBatchId = highlightBatchId;

	material.onBeforeCompile = shader => {

		shader.uniforms.highlightBatchId = highlightBatchId;

		shader.vertexShader = shader.vertexShader
			.replace( '#include <common>', /* glsl */`
				#include <common>
				attribute float _batchid;
				varying float vBatchId;
			` )
			.replace( '#include <begin_vertex>', /* glsl */`
				#include <begin_vertex>
				vBatchId = _batchid;
			` );

		// the batch id is quantized by draco, so it arrives a fraction away from a whole number
		shader.fragmentShader = shader.fragmentShader
			.replace( '#include <common>', /* glsl */`
				#include <common>
				uniform float highlightBatchId;
				varying float vBatchId;
			` )
			.replace( '#include <color_fragment>', /* glsl */`

				if ( abs( vBatchId - highlightBatchId ) < 0.5 ) {

					diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.3, 0.82, 0.88 ), 1.0 ) * 2.0;

				}

				#include <color_fragment>
			` );

	};

}

init();
animate();

function init() {

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 160000000 );

	// lights
	const ambientLight = new AmbientLight( 0xffffff, 0.25 );
	const dirLight = new DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 1, 1, 1 );
	camera.add( ambientLight, dirLight, dirLight.target );
	scene.add( camera );

	// controls
	controls = new GlobeControls( scene, camera, renderer.domElement, null );
	controls.enableDamping = true;

	terrainTiles = new TilesRenderer();
	terrainTiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2767062', autoRefreshToken: true } ) );
	terrainTiles.registerPlugin( new TilesFadePlugin() );
	terrainTiles.registerPlugin( new ImageOverlayPlugin( {
		renderer,
		overlays: [ new CesiumIonOverlay( {
			assetId: '2',
			apiToken: import.meta.env.VITE_ION_KEY,
		} ) ],
	} ) );
	terrainTiles.group.rotation.x = - Math.PI / 2;
	scene.add( terrainTiles.group );

	plateauTiles = new TilesRenderer();
	plateauTiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2602291', autoRefreshToken: true } ) );
	plateauTiles.registerPlugin( new TilesFadePlugin() );
	plateauTiles.registerPlugin( new GLTFExtensionsPlugin( {
		dracoLoader: new DRACOLoader(),
		ktxLoader: new KTX2Loader().detectSupport( renderer ),
	} ) );
	plateauTiles.registerPlugin( new MeshBVHPlugin() );
	plateauTiles.group.rotation.x = - Math.PI / 2;
	scene.add( plateauTiles.group );

	// building selection
	plateauTiles.addEventListener( 'load-model', applyBuildingHighlight );
	renderer.domElement.addEventListener( 'pointerdown', onPointerDown );
	renderer.domElement.addEventListener( 'click', onClickBuilding );

	// raise the byte cache so tiles aren't evicted too aggressively while panning the city
	DEFAULT_LRU_CACHE.minBytesSize = 5e8;
	DEFAULT_LRU_CACHE.maxBytesSize = 1e9;

	// raise the concurrent download / parse limits so tiles stream in faster. These queues are shared
	// across all tiles renderers, so setting them once covers both the terrain and PLATEAU renderers.
	DEFAULT_DOWNLOAD_QUEUE.maxJobs = 50;
	DEFAULT_PARSE_QUEUE.maxJobs = 10;

	// both datasets share the ellipsoid frame; drive the controls from the terrain
	controls.setEllipsoid( terrainTiles.ellipsoid, terrainTiles.group );

	// position the camera over central Tokyo near the National Stadium, from lat / lon / height and
	// azimuth / elevation in the tileset's ellipsoid frame, then move it into world space
	terrainTiles.group.updateMatrixWorld();
	terrainTiles.ellipsoid.getObjectFrame(
		35.66588 * MathUtils.DEG2RAD, 139.70928 * MathUtils.DEG2RAD, 664,
		0.3211, - 0.382, 0,
		camera.matrixWorld, CAMERA_FRAME,
	);
	camera.matrixWorld
		.premultiply( terrainTiles.group.matrixWorld )
		.decompose( camera.position, camera.quaternion, camera.scale );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'plateauErrorTarget', 1, 30, 1 ).name( 'PLATEAU error' );
	gui.add( params, 'terrainErrorTarget', 1, 40, 1 ).name( 'terrain error' );

}

function onWindowResize() {

	const aspect = window.innerWidth / window.innerHeight;

	camera.aspect = aspect;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

	requestAnimationFrame( animate );

	controls.update();
	camera.updateMatrixWorld();

	terrainTiles.errorTarget = params.terrainErrorTarget;
	plateauTiles.errorTarget = params.plateauErrorTarget;

	// update both tile sets against the shared camera
	for ( const tiles of [ terrainTiles, plateauTiles ] ) {

		tiles.setResolutionFromRenderer( camera, renderer );
		tiles.setCamera( camera );
		tiles.update();

	}

	updateCredits();
	positionBuildingInfo();

	renderer.render( scene, camera );

}

function onPointerDown( e ) {

	_pointerDown.set( e.clientX, e.clientY );

}

// Selects the building under the cursor. PLATEAU carries its CityGML attributes through into the
// b3dm batch tables, keyed by the "_batchid" attribute.
function onClickBuilding( e ) {

	// anything that moved past the threshold is a camera drag rather than a click
	if ( _pointerDown.distanceTo( _vector2.set( e.clientX, e.clientY ) ) > CLICK_DRAG_THRESHOLD ) {

		return;

	}

	// while something is selected the next click just dismisses it
	if ( selectedGmlId !== null ) {

		clearBuildingSelection();
		return;

	}

	const rect = renderer.domElement.getBoundingClientRect();
	_pointer.x = ( ( e.clientX - rect.left ) / rect.width ) * 2 - 1;
	_pointer.y = - ( ( e.clientY - rect.top ) / rect.height ) * 2 + 1;

	const raycaster = new Raycaster();
	raycaster.setFromCamera( _pointer, camera );
	raycaster.firstHitOnly = true;

	const hit = raycaster.intersectObject( plateauTiles.group, true )[ 0 ];
	if ( ! hit ) {

		clearBuildingSelection();
		return;

	}

	const { object, face } = hit;
	const batchTable = getBatchTable( object );
	const batchIdAttribute = object.geometry.getAttribute( '_batchid' );
	if ( batchTable === null || batchIdAttribute === undefined ) {

		clearBuildingSelection();
		return;

	}

	// draco quantizes the batch id, so it comes back a fraction away from a whole number
	const id = Math.round( batchIdAttribute.getX( face.a ) );
	const data = batchTable.getDataFromId( id );

	updateBuildingAnchor( object, batchIdAttribute, id );
	selectBuilding( data[ 'gml:id' ] );
	showBuildingInfo( data );

}

// grows the box over the vertices carrying the given batch id, transformed by "matrix" when given
function expandBuildingBox( target, object, batchIdAttribute, id, matrix = null ) {

	const position = object.geometry.getAttribute( 'position' );
	const index = object.geometry.getIndex();
	const count = index !== null ? index.count : position.count;

	target.makeEmpty();

	for ( let i = 0; i < count; i ++ ) {

		const vertex = index !== null ? index.getX( i ) : i;
		if ( Math.round( batchIdAttribute.getX( vertex ) ) !== id ) {

			continue;

		}

		_buildingVector.fromBufferAttribute( position, vertex );
		if ( matrix !== null ) {

			_buildingVector.applyMatrix4( matrix );

		}

		target.expandByPoint( _buildingVector );

	}

}

// anchors the panel over the top center of the building, measured in a gravity aligned enu frame
function updateBuildingAnchor( object, batchIdAttribute, id ) {

	// first pass in the tile's frame to find the building center
	expandBuildingBox( _buildingBox, object, batchIdAttribute, id );
	_buildingBox.getCenter( _buildingVector ).applyMatrix4( object.matrixWorld );

	// the ellipsoid functions operate in the tiles group frame, so move the point there
	const group = plateauTiles.group;
	_groupToLocal.copy( group.matrixWorld ).invert();
	_buildingVector.applyMatrix4( _groupToLocal );

	const ellipsoid = plateauTiles.ellipsoid;
	ellipsoid.getPositionToCartographic( _buildingVector, _cartographic );
	ellipsoid.getEastNorthUpFrame( _cartographic.lat, _cartographic.lon, _cartographic.height, _enuFrame );

	// second pass measures the box in the enu frame so its top is directly above the building
	_localToEnuFrame.copy( _enuFrame ).invert().multiply( _groupToLocal ).multiply( object.matrixWorld );
	expandBuildingBox( _buildingBox, object, batchIdAttribute, id, _localToEnuFrame );

	buildingAnchorWorld
		.set(
			( _buildingBox.min.x + _buildingBox.max.x ) / 2,
			( _buildingBox.min.y + _buildingBox.max.y ) / 2,
			_buildingBox.max.z,
		)
		.applyMatrix4( _enuFrame )
		.applyMatrix4( group.matrixWorld );

}

// The selection is held as the building's "gml:id", which is stable across tiles and lods, and each
// visible tile resolves it back to its own batch id so the highlight survives tile streaming.
let selectedGmlId = null;

function selectBuilding( gmlId ) {

	selectedGmlId = gmlId ?? null;
	applyBuildingHighlight();

}

function clearBuildingSelection() {

	selectedGmlId = null;
	applyBuildingHighlight();

	document.getElementById( 'building' ).style.display = 'none';

}

function applyBuildingHighlight() {

	plateauTiles.group.traverse( c => {

		if ( ! c.material || ! c.geometry || c.geometry.getAttribute( '_batchid' ) === undefined ) {

			return;

		}

		// patch the highlight into materials the first time they are seen
		const { material } = c;
		if ( material.userData.highlightBatchId === undefined ) {

			addBuildingHighlight( material );
			material.needsUpdate = true;

		}

		material.userData.highlightBatchId.value = findBatchId( c, selectedGmlId );

	} );

}

// the row index of the given building within the tile's batch table, or -1 if it is not in this tile
function findBatchId( object, gmlId ) {

	if ( gmlId === null ) {

		return - 1;

	}

	const batchTable = getBatchTable( object );
	const ids = batchTable !== null ? batchTable.getPropertyArray( 'gml:id' ) : null;

	return ids ? ids.indexOf( gmlId ) : - 1;

}

// b3dm batch tables are attached to the tile's root scene rather than the mesh, so walk up
function getBatchTable( object ) {

	for ( let c = object; c !== null; c = c.parent ) {

		if ( c.batchTable ) {

			return c.batchTable;

		}

	}

	return null;

}

// formats a signed angle in degrees as degrees, minutes and seconds with a hemisphere letter
function toDegreesMinutesSeconds( value, positive, negative ) {

	const direction = value < 0 ? negative : positive;
	value = Math.abs( value );

	const degrees = Math.floor( value );
	const minutesDecimal = ( value - degrees ) * 60;
	const minutes = Math.floor( minutesDecimal );
	const seconds = Math.floor( ( minutesDecimal - minutes ) * 60 );

	return `${ degrees }° ${ minutes }' ${ seconds }" ${ direction }`;

}

function showBuildingInfo( data ) {

	const rows = BUILDING_FIELDS
		.filter( ( { key } ) => data[ key ] !== undefined && data[ key ] !== null && data[ key ] !== '' )
		.map( ( { key, label, format } ) => {

			const value = format ? format( data[ key ] ) : data[ key ];
			return `<dt>${ label }</dt><dd>${ value }</dd>`;

		} )
		.join( '' );

	const el = document.getElementById( 'building' );
	el.innerHTML = `<dl>${ rows }</dl>`;
	el.style.display = 'block';

	positionBuildingInfo();

}

// places the panel above the selected building, tracking it as the camera moves
function positionBuildingInfo() {

	const el = document.getElementById( 'building' );
	if ( el.style.display === 'none' ) {

		return;

	}

	const rect = renderer.domElement.getBoundingClientRect();
	_buildingAnchor.copy( buildingAnchorWorld ).project( camera );

	// hide it while the building is behind the camera rather than mirroring it onto the screen
	if ( _buildingAnchor.z > 1 ) {

		el.style.visibility = 'hidden';
		return;

	}

	el.style.visibility = 'visible';

	const anchorX = rect.left + ( _buildingAnchor.x * 0.5 + 0.5 ) * rect.width;
	const anchorY = rect.top + ( - _buildingAnchor.y * 0.5 + 0.5 ) * rect.height;

	// centered over the building, travelling off the edge of the window with it
	el.style.left = ( anchorX - el.offsetWidth / 2 ) + 'px';
	el.style.top = ( anchorY - el.offsetHeight - TOOLTIP_CARET_SIZE - TOOLTIP_ANCHOR_GAP ) + 'px';
	el.style.setProperty( '--caret-x', '50%' );

}

function updateCredits() {

	const credits = new Set();
	const attrs = [ ...plateauTiles.getAttributions(), ...terrainTiles.getAttributions() ];
	for ( const { value } of attrs ) {

		if ( ! /<img/.test( value ) ) {

			credits.add( value );

		}

	}

	const html = Array.from( credits ).join( '<br>' );
	const el = document.getElementById( 'credits' );
	el.innerHTML = html;

}
