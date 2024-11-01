import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Vector2,
	Raycaster,
	Triangle,
	Vector3,
	Sphere,
	Group,
} from 'three';
import {
	EnvironmentControls,
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	GLTFMeshFeaturesExtension,
	GLTFStructuralMetadataExtension,
	CesiumIonAuthPlugin,
} from '3d-tiles-renderer/plugins';
import { MeshFeaturesMaterialMixin } from './src/MeshFeaturesMaterial';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

// FEATURE_IDs
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdAttribute/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdTexture/tileset.json';

// STRUCTURAL_METADATA
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/SimplePropertyTexture/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/PropertyAttributesPointCloud/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/SharedPropertyTable/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/MultipleFeatureIdsAndProperties/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/MultipleClasses/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/FeatureIdAttributeAndPropertyTable/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/FeatureIdTextureAndPropertyTable/tileset.json';
// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/ComplexTypes/tileset.json';

// page elements
let camera, controls, scene, renderer;
let dirLight, tiles, rotationContainer;
let meshFeaturesEl, structuralMetadataEl, gui;

// hovered feature state
let controlsActive = false;
let hoveredInfo = null;
let updatingFeatures = false;

// raycaster objects
const pointer = new Vector2( - 1, - 1 );
const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
raycaster.params.Points.threshold = 0.05;

// gui parameters
const apiKey = localStorage.getItem( 'ionApiKey' ) ?? 'put-your-api-key-here';
const params = {
	accessToken: apiKey,
	assetId: 2333904,
	reload: () => {

		reinstantiateTiles();

	},

	featureIndex: 0,
	propertyTexture: 0,
	highlightAllFeatures: false,
};

init();
animate();

function init() {

	// dom elements
	meshFeaturesEl = document.getElementById( 'meshFeatures' );

	structuralMetadataEl = document.getElementById( 'structuralMetadata' );

	// renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	document.body.appendChild( renderer.domElement );

	// scene
	scene = new Scene();

	// camera
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 5000 );
	camera.position.set( - 4, 2, 0 ).multiplyScalar( 30 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.minDistance = 0.1;
	controls.cameraRadius = 0.1;
	controls.minAltitude = 0;
	controls.maxAltitude = Math.PI;
	controls.adjustHeight = false;

	controls.addEventListener( 'start', () => controlsActive = true );
	controls.addEventListener( 'end', () => controlsActive = false );

	// lights
	dirLight = new DirectionalLight( 0xffffff, 3.3 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );
	scene.add( dirLight );

	scene.add( new AmbientLight( 0xffffff, 1.0 ) );

	// create rotation object to orient the tile set
	rotationContainer = new Group();
	rotationContainer.position.y = 40;
	scene.add( rotationContainer );

	// initialize tileset
	reinstantiateTiles();

	// events
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'pointermove', e => {

		pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	} );

}

function buildGUI() {

	if ( gui ) {

		gui.destroy();

	}

	// gui
	gui = new GUI();
	const ionFolder = gui.addFolder( 'ion' );
	ionFolder.add( params, 'accessToken' );
	ionFolder.add( params, 'assetId', [ 2333904, 2342602 ] ).onChange( reinstantiateTiles );
	ionFolder.add( params, 'reload' );

	const featureFolder = gui.addFolder( 'features' );
	if ( params.assetId === 2333904 ) {

		featureFolder.add( params, 'featureIndex', [ 0, 1 ] );
		featureFolder.add( params, 'highlightAllFeatures' );

	} else {

		featureFolder.add( params, 'propertyTexture', { NONE: 0, HORIZ_UNCERTAINTY: 1, VERT_UNCERTAINTY: 2 } );

	}

}

function reinstantiateTiles() {

	// remove any existing tileset
	if ( tiles ) {

		tiles.dispose();
		tiles.group.removeFromParent();

	}

	// save the ion access token
	localStorage.setItem( 'ionApiKey', params.accessToken );

	// create tile set
	tiles = new TilesRenderer();
	tiles.registerPlugin( new CesiumIonAuthPlugin( { apiToken: params.accessToken, assetId: params.assetId } ) );
	tiles.setCamera( camera );
	rotationContainer.add( tiles.group );

	// set up gltf loader to support mesh features and structural metadata
	const loader = new GLTFLoader( tiles.manager );
	loader.register( () => new GLTFMeshFeaturesExtension() );
	loader.register( () => new GLTFStructuralMetadataExtension() );
	tiles.manager.addHandler( /(gltf|glb)$/g, loader );

	// set up the materials for highlighting features
	tiles.addEventListener( 'load-model', ( { scene } ) => {

		scene.traverse( c => {

			if ( c.material && c.userData.meshFeatures ) {

				const MaterialConstructor = MeshFeaturesMaterialMixin( c.material.constructor );
				const material = new MaterialConstructor();
				material.copy( c.material );
				material.metalness = 0;

				c.material = material;

			}

			if ( c.material && c.userData.structuralMetadata ) {

				c.material.originalMap = c.material.map;

			}

		} );

	} );

	buildGUI();

}

// resize the renderer
function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

}

// append structural metadata information table
function appendStructuralMetadata( structuralMetadata, triangle, barycoord, index = null, tableIndices = null, features = null ) {

	structuralMetadataEl.innerText = 'STRUCTURAL_METADATA\n';

	// append property table data
	if ( tableIndices !== null ) {

		const data = structuralMetadata.getPropertyTableData( tableIndices, features );
		appendRows( data, structuralMetadata.getPropertyTableInfo( tableIndices ) );

	}

	// append property attribute data
	if ( index !== null ) {

		appendRows( structuralMetadata.getPropertyAttributeData( index ), structuralMetadata.getPropertyAttributeInfo() );

	}

	// append property texture data
	appendRows( structuralMetadata.getPropertyTextureData( triangle, barycoord ), structuralMetadata.getPropertyTextureInfo() );

	// function for writing rows
	function appendRows( data, info ) {

		const maxPropertyName = Math.max( ...Object.values( data ).flatMap( v => Object.keys( v ) ).map( n => n.length ) );
		for ( const i in data ) {

			structuralMetadataEl.innerText += `\n${ info[ i ].name || info[ i ].className }\n`;

			const properties = data[ i ];
			for ( const propertyName in properties ) {

				let field = properties[ propertyName ];
				if ( field && field.toArray ) {

					field = field.toArray();

				}

				if ( field && field.join ) {

					field = '\n' + field
						.map( n => n.toFixed ? parseFloat( n.toFixed( 6 ) ) : n )
						.map( ( v, i ) => `    [${ i }] ${ v }` ).join( '\n' );

				}

				if ( typeof field === 'number' ) {

					field = parseFloat( field.toFixed( 6 ) );

				}

				structuralMetadataEl.innerText += `  ${ propertyName.padEnd( maxPropertyName + 1 ) } : ${ field }\n`;

			}

		}

	}

}

// update raycasting to find hovered mesh features
function updateMeshFeatureRaycast() {

	if ( updatingFeatures || controlsActive ) {

		return;

	}

	raycaster.setFromCamera( pointer, camera );

	const hit = raycaster.intersectObject( scene )[ 0 ];
	if ( hit ) {

		// get the barycentric coordinate for sampling mesh feature data
		const { object, face, point, index, faceIndex } = hit;
		const barycoord = new Vector3();
		if ( face ) {

			const triangle = new Triangle();
			triangle.setFromAttributeAndIndices( object.geometry.attributes.position, face.a, face.b, face.c );
			triangle.a.applyMatrix4( object.matrixWorld );
			triangle.b.applyMatrix4( object.matrixWorld );
			triangle.c.applyMatrix4( object.matrixWorld );
			triangle.getBarycoord( point, barycoord );

		} else {

			barycoord.set( 0, 0, 0 );

		}

		// save the feature and hit information for use in updating the tables and materials
		const { meshFeatures } = hit.object.userData;
		if ( meshFeatures ) {

			updatingFeatures = true;
			meshFeatures.getFeaturesAsync( faceIndex, barycoord )
				.then( features => {

					updatingFeatures = false;
					hoveredInfo = {
						index,
						features,
						faceIndex,
						barycoord,
						object,
					};

				} );

		} else {

			hoveredInfo = {
				index,
				features: null,
				faceIndex,
				barycoord,
				object,
			};

		}

	} else {

		hoveredInfo = null;

	}

}

// Update the mesh feature material and meta data table displays
function updateMetaDataDisplay() {

	const { featureIndex } = params;

	let meshFeatures = null;
	let structuralMetadata = null;
	let features = null;
	if ( hoveredInfo ) {

		meshFeatures = hoveredInfo.object.userData.meshFeatures;
		structuralMetadata = hoveredInfo.object.userData.structuralMetadata;
		features = hoveredInfo.features;

	}

	if ( meshFeatures !== null && features !== null ) {

		// update the mesh feature info
		const { index, faceIndex, barycoord } = hoveredInfo;
		meshFeaturesEl.innerText = 'EXT_MESH_FEATURES\n\n';
		meshFeaturesEl.innerText += `feature        : ${ features.map( v => v + '' ).join( ', ' ) }\n`;
		meshFeaturesEl.innerText += `texture memory : ${ renderer.info.memory.textures }\n`;

		// update structural metadata table
		if ( structuralMetadata !== null ) {

			const info = meshFeatures.getFeatureInfo();
			const tableIndices = info.map( p => p.propertyTable );
			appendStructuralMetadata( structuralMetadata, faceIndex, barycoord, index, tableIndices, features );

		}

	} else {

		// update the mesh feature info
		meshFeaturesEl.innerText = 'EXT_MESH_FEATURES\n\n';
		meshFeaturesEl.innerText += 'feature        : -\n';
		meshFeaturesEl.innerText += `texture memory : ${ renderer.info.memory.textures }`;

		// update structural metadata table
		if ( structuralMetadata !== null ) {

			const { index, faceIndex, barycoord } = hoveredInfo;
			appendStructuralMetadata( structuralMetadata, faceIndex, barycoord, index );

		} else {

			structuralMetadataEl.innerText = '';

		}

	}

	// update the materials
	tiles.forEachLoadedModel( scene => scene.traverse( child => {

		const material = child.material;
		const { meshFeatures, structuralMetadata } = child.userData;

		// set the highlight state for the mesh features
		if ( material && meshFeatures ) {

			if ( params.highlightAllFeatures ) {

				material.setFromMeshFeatures( meshFeatures, featureIndex );
				material.highlightFeatureId = null;

			} else if ( hoveredInfo === null ) {

				material.disableFeatureDisplay();

			} else {

				const id = features[ featureIndex ];
				material.setFromMeshFeatures( meshFeatures, featureIndex );
				material.highlightFeatureId = id === null ? - 1 : id;

			}

		}

		// assign textures from structured metadata
		if ( material && structuralMetadata && structuralMetadata.textureAccessors.length > 0 ) {

			let newTexture = null;
			if ( params.propertyTexture === 0 ) {

				newTexture = material.originalMap;

			} else if ( params.propertyTexture === 1 ) {

				const info = structuralMetadata.getPropertyTextureInfo()[ 0 ];
				const prop = info.properties.r3dm_uncertainty_ce90sum;
				newTexture = structuralMetadata.textures[ prop.index ];
				newTexture.channel = prop.texCoord;

			} else if ( params.propertyTexture === 2 ) {

				const info = structuralMetadata.getPropertyTextureInfo()[ 1 ];
				const prop = info.properties.r3dm_uncertainty_le90sum;
				newTexture = structuralMetadata.textures[ prop.index ];
				newTexture.channel = prop.texCoord;

			}

			if ( material.map !== newTexture ) {

				material.map = newTexture;
				material.needsUpdate = true;

			}

		}

	} ) );

}

// render and animate
function animate() {

	requestAnimationFrame( animate );

	// update controls and camera
	controls.update();
	camera.updateMatrixWorld();

	// update metadata
	updateMetaDataDisplay();
	updateMeshFeatureRaycast();

	// center tiles
	const sphere = new Sphere();
	const upVector = new Vector3( 0, 1, 0 );
	tiles.getBoundingSphere( sphere );
	tiles.group.position.copy( sphere.center ).multiplyScalar( - 1 );

	rotationContainer.quaternion.setFromUnitVectors( sphere.center.normalize(), upVector );

	// update tiles
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	// render
	renderer.render( scene, camera );

}
