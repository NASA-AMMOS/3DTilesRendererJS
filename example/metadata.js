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
} from 'three';
import { TilesRenderer, EnvironmentControls } from '..';
import { MeshFeaturesMaterialMixin } from './src/MeshFeaturesMaterial';

// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdAttribute/tileset.json';
const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdTexture/tileset.json';

let camera, controls, scene, renderer;
let dirLight, tiles;
let metadataEl;

let hoveredMaterial = null;
const barycoord = new Vector3();
const triangle = new Triangle();
const pointer = new Vector2( - 1, - 1 );
const raycaster = new Raycaster();

init();
animate();

function init() {

	metadataEl = document.getElementById( 'metadata' );

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
	controls.minAltitude = - Math.PI;
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

function updateMetadata() {

	raycaster.setFromCamera( pointer, camera );

	const hit = raycaster.intersectObject( scene )[ 0 ];
	if ( hit && hit.object.userData.meshFeatures ) {

		const { object, face, point } = hit;
		triangle.setFromAttributeAndIndices( object.geometry.attributes.position, face.a, face.b, face.c );
		triangle.a.applyMatrix4( object.matrixWorld );
		triangle.b.applyMatrix4( object.matrixWorld );
		triangle.c.applyMatrix4( object.matrixWorld );
		triangle.getBarycoord( point, barycoord );


		const { meshFeatures, structuralMetadata } = hit.object.userData;
		meshFeatures.getFeaturesAsync( hit.faceIndex, barycoord )
			.then( features => {

				if ( object.material === hoveredMaterial ) {

					tiles.forEachLoadedModel( scene => scene.traverse( child => {

						// TODO: must find way to ensure the id is referencing the same "type" of feature - either
						// from feature table or mesh features label
						if ( child.material ) {

							child.material.setFromMeshFeatures( meshFeatures, 0 );
							child.material.highlightFeatureId = features[ 0 ];

						}

					} ) );

					metadataEl.innerText = `feature : ${ features[ 0 ] }`;
					metadataEl.innerText += `\ntextures: ${ renderer.info.memory.textures }`;

					const info = meshFeatures.getFeatureInfo()[ 0 ];
					const propertyTable = structuralMetadata.tableAccessors[ info.propertyTable ];
					propertyTable.getPropertyValue( 'example_VEC3_FLOAT32', features[ 0 ] );
					// console.log( features[ 0 ] )



				}

			} );


		if ( hoveredMaterial && hoveredMaterial !== object.material ) {

			hoveredMaterial.disableFeatureDisplay();

		}

		hoveredMaterial = object.material;

	} else {

		if ( hoveredMaterial ) {


			tiles.forEachLoadedModel( scene => scene.traverse( child => {

				if ( child.material ) {

					child.material.disableFeatureDisplay();

				}

			} ) );

		}

		hoveredMaterial = null;
		metadataEl.innerText = 'feature : null';
		metadataEl.innerText += `\ntextures: ${ renderer.info.memory.textures }`;

	}

}

function animate() {

	requestAnimationFrame( animate );

	controls.update();
	camera.updateMatrixWorld();

	updateMetadata();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	renderer.render( scene, camera );

}
