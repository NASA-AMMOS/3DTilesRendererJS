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
	TilesRenderer,
	EnvironmentControls,
	GLTFMeshFeaturesExtension,
	GLTFStructuralMetadataExtension,
	CesiumIonTilesRenderer,
} from '..';
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
const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_structural_metadata/ComplexTypes/tileset.json';

let camera, controls, scene, renderer;
let dirLight, tiles, rotationContainer;
let meshFeaturesEl, structuralMetadataEl;
let controlsActive = false;

let hoveredInfo = null;
let updatingFeatures = false;

const pointer = new Vector2( - 1, - 1 );
const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
raycaster.params.Points.threshold = 0.05;

const apiKey = localStorage.getItem( 'ionApiKey' ) ?? 'put-your-api-key-here';
const params = {
	accessToken: apiKey,
	assetId: 2333904,
	reload: () => {

		reinstantiateTiles();

	},

	featureIndex: 0,
	highlightAllFeatures: false,
};

init();
animate();

function init() {

	meshFeaturesEl = document.getElementById( 'meshFeatures' );

	structuralMetadataEl = document.getElementById( 'structuralMetadata' );

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 5000 );
	camera.position.set( - 4, 2, 4 ).multiplyScalar( 30 );
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

	const ambLight = new AmbientLight( 0xffffff, 1.0 );
	scene.add( ambLight );

	rotationContainer = new Group();
	rotationContainer.rotation.set( 4, 0.7, - 0.1 );
	rotationContainer.position.y = 40;
	scene.add( rotationContainer );

	reinstantiateTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'pointermove', e => {

		pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	} );

	const gui = new GUI();
	const ionFolder = gui.addFolder( 'ion' );
	ionFolder.add( params, 'accessToken' );
	ionFolder.add( params, 'assetId' );
	ionFolder.add( params, 'reload' );

	const featureFolder = gui.addFolder( 'features' );
	featureFolder.add( params, 'featureIndex', [ 0, 1 ] );
	featureFolder.add( params, 'highlightAllFeatures' );

}

function reinstantiateTiles() {

	localStorage.setItem( 'ionApiKey', params.accessToken );

	if ( tiles ) {

		tiles.dispose();

	}

	tiles = new CesiumIonTilesRenderer( params.assetId, params.accessToken );
	tiles.setCamera( camera );
	rotationContainer.add( tiles.group );

	const loader = new GLTFLoader( tiles.manager );
	loader.register( () => new GLTFMeshFeaturesExtension() );
	loader.register( () => new GLTFStructuralMetadataExtension() );
	tiles.manager.addHandler( /(gltf|glb)$/g, loader );

	tiles.addEventListener( 'load-model', ( { scene } ) => {

		scene.traverse( c => {

			if ( c.material && c.userData.meshFeatures ) {

				const MaterialConstructor = MeshFeaturesMaterialMixin( c.material.constructor );
				const material = new MaterialConstructor();
				material.copy( c.material );
				material.metalness = 0;

				c.material = material;

			}

		} );

	} );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

}

function appendStructuralMetadata( structuralMetadata, triangle, barycoord, index = null, tableIndices = null, features = null ) {

	structuralMetadataEl.innerText = 'STRUCTURAL_METADATA\n';

	if ( tableIndices !== null ) {

		const data = structuralMetadata.getPropertyTableData( tableIndices, features );
		appendRows( data, structuralMetadata.getPropertyTableInfo( tableIndices ) );

	}

	if ( index !== null ) {

		appendRows( structuralMetadata.getPropertyAttributeData( index ), structuralMetadata.getPropertyAttributeInfo() );

	}

	appendRows( structuralMetadata.getPropertyTextureData( triangle, barycoord ), structuralMetadata.getPropertyTextureInfo() );

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

function updateMetadata() {

	if ( updatingFeatures || controlsActive ) {

		return;

	}

	raycaster.setFromCamera( pointer, camera );

	const hit = raycaster.intersectObject( scene )[ 0 ];
	if ( hit ) {

		const { object, face, point, index, faceIndex } = hit;
		const triangle = new Triangle();
		const barycoord = new Vector3();
		if ( face ) {

			triangle.setFromAttributeAndIndices( object.geometry.attributes.position, face.a, face.b, face.c );
			triangle.a.applyMatrix4( object.matrixWorld );
			triangle.b.applyMatrix4( object.matrixWorld );
			triangle.c.applyMatrix4( object.matrixWorld );
			triangle.getBarycoord( point, barycoord );

		} else {

			triangle.setFromAttributeAndIndices( object.geometry.attributes.position, index, index, index );
			triangle.a.applyMatrix4( object.matrixWorld );
			triangle.b.applyMatrix4( object.matrixWorld );
			triangle.c.applyMatrix4( object.matrixWorld );
			barycoord.set( 0, 0, 0 );

		}

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

function updateFeatureIdMaterials() {

	const { featureIndex } = params;

	let meshFeatures = null;
	let structuralMetadata = null;
	if ( hoveredInfo ) {

		meshFeatures = hoveredInfo.object.userData.meshFeatures;
		structuralMetadata = hoveredInfo.object.userData.structuralMetadata;

	}

	if ( meshFeatures !== null && hoveredInfo.features ) {

		const { index, features, faceIndex, barycoord } = hoveredInfo;
		meshFeaturesEl.innerText = 'EXT_MESH_FEATURES\n\n';
		meshFeaturesEl.innerText += `feature        : ${ features.map( v => v + '' ).join( ', ' ) }\n`;
		meshFeaturesEl.innerText += `texture memory : ${ renderer.info.memory.textures }\n`;

		if ( structuralMetadata ) {

			const info = meshFeatures.getFeatureInfo();
			const tableIndices = info.map( p => p.propertyTable );
			appendStructuralMetadata( structuralMetadata, faceIndex, barycoord, index, tableIndices, features );

		}

		tiles.forEachLoadedModel( scene => scene.traverse( child => {

			if ( child.material && child.material.isMeshFeaturesMaterial ) {

				if ( params.highlightAllFeatures ) {

					child.material.setFromMeshFeatures( child.userData.meshFeatures, featureIndex );
					child.material.highlightFeatureId = null;

				} else if ( features[ featureIndex ] === null ) {

					child.material.disableFeatureDisplay();

				} else {

					child.material.setFromMeshFeatures( child.userData.meshFeatures, featureIndex );
					child.material.highlightFeatureId = features[ featureIndex ];

				}

			}

		} ) );

	} else {

		meshFeaturesEl.innerText = 'EXT_MESH_FEATURES\n\n';
		meshFeaturesEl.innerText += 'feature        : -\n';
		meshFeaturesEl.innerText += `texture memory : ${ renderer.info.memory.textures }`;

		structuralMetadataEl.innerText = '';

		if ( structuralMetadata !== null ) {

			const { index, faceIndex, barycoord } = hoveredInfo;
			appendStructuralMetadata( structuralMetadata, faceIndex, barycoord, index );

		}

		tiles.forEachLoadedModel( scene => scene.traverse( child => {

			if ( child.material && child.material.isMeshFeaturesMaterial ) {

				if ( params.highlightAllFeatures ) {

					child.material.setFromMeshFeatures( child.userData.meshFeatures, featureIndex );
					child.material.highlightFeatureId = null;

				} else {

					child.material.disableFeatureDisplay();

				}

			}

		} ) );

	}

}

function animate() {

	requestAnimationFrame( animate );

	controls.update();
	camera.updateMatrixWorld();

	updateFeatureIdMaterials();
	updateMetadata();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	const sphere = new Sphere();
	tiles.getBoundingSphere( sphere );
	tiles.group.position.copy( sphere.center ).multiplyScalar( - 1 );

	renderer.render( scene, camera );

}
