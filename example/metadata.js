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
} from 'three';
import { TilesRenderer, EnvironmentControls } from '..';
import { MeshFeaturesMaterialMixin } from './src/MeshFeaturesMaterial';

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
let dirLight, tiles;
let meshFeaturesEl, structuralMetadataEl;

let hoveredMaterial = null;
const barycoord = new Vector3();
const triangle = new Triangle();
const pointer = new Vector2( - 1, - 1 );
const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
raycaster.params.Points.threshold = 0.05;

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

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 400 );
	camera.position.set( 4, 4, 4 );
	camera.lookAt( 0, 0, 0 );

	// controls
	controls = new EnvironmentControls( scene, camera, renderer.domElement );
	controls.minDistance = 0.1;
	controls.cameraRadius = 0.1;
	controls.minAltitude = 0;
	controls.maxAltitude = Math.PI;
	controls.adjustHeight = false;

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );

	const ambLight = new AmbientLight( 0xffffff, 1.05 );
	scene.add( ambLight );

	tiles = new TilesRenderer( URL );
	tiles.setCamera( camera );
	scene.add( tiles.group );

	tiles.addEventListener( 'load-model', ( { scene } ) => {

		scene.traverse( c => {

			if ( c.material && c.userData.meshFeatures ) {

				const MaterialConstructor = MeshFeaturesMaterialMixin( c.material.constructor );
				const material = new MaterialConstructor();
				material.copy( c.material );

				c.material = material;

			}

		} );

	} );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'pointermove', e => {

		pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

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

	raycaster.setFromCamera( pointer, camera );

	const hit = raycaster.intersectObject( scene )[ 0 ];
	if ( hit ) {

		const { object, face, point, index } = hit;
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

		const { meshFeatures, structuralMetadata } = hit.object.userData;
		if ( meshFeatures ) {

			meshFeatures.getFeaturesAsync( hit.faceIndex, barycoord )
				.then( features => {

					if ( object.material === hoveredMaterial ) {

						tiles.forEachLoadedModel( scene => scene.traverse( child => {

							// TODO: must find way to ensure the id is referencing the same "type" of feature - either
							// from feature table or mesh features label. Perhaps table name?
							if ( child.material && child.material.isMeshFeaturesMaterial ) {

								child.material.setFromMeshFeatures( meshFeatures, 0 );
								child.material.highlightFeatureId = features[ 0 ];

							}

						} ) );

						meshFeaturesEl.innerText = 'EXT_MESH_FEATURES\n\n';
						meshFeaturesEl.innerText += `feature        : ${ features.join( ', ' ) }\n`;
						meshFeaturesEl.innerText += `texture memory : ${ renderer.info.memory.textures }\n`;

						if ( structuralMetadata ) {

							const info = meshFeatures.getFeatureInfo();
							const tableIndices = info.map( p => p.propertyTable );
							appendStructuralMetadata( structuralMetadata, hit.faceIndex, barycoord, index, tableIndices, features );

						}

					}

				} );

		} else if ( structuralMetadata ) {

			appendStructuralMetadata( structuralMetadata, hit.faceIndex, barycoord, index );

		}

		if ( hoveredMaterial && hoveredMaterial !== object.material && hoveredMaterial.isMeshFeaturesMaterial ) {

			hoveredMaterial.disableFeatureDisplay();

		}

		hoveredMaterial = object.material;

	} else {

		if ( hoveredMaterial ) {


			tiles.forEachLoadedModel( scene => scene.traverse( child => {

				if ( child.material && child.material.isMeshFeaturesMaterial ) {

					child.material.disableFeatureDisplay();

				}

			} ) );

		}

		hoveredMaterial = null;
		meshFeaturesEl.innerText = 'EXT_MESH_FEATURES\n\n';
		meshFeaturesEl.innerText += 'feature        : -\n';
		meshFeaturesEl.innerText += `texture memory : ${ renderer.info.memory.textures }`;

		structuralMetadataEl.innerText = '';

	}

}

function animate() {

	requestAnimationFrame( animate );

	controls.update();
	camera.updateMatrixWorld();

	updateMetadata();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	const sphere = new Sphere();
	tiles.getBoundingSphere( sphere );
	tiles.group.position.copy( sphere.center ).multiplyScalar( - 1 );

	renderer.render( scene, camera );

}
