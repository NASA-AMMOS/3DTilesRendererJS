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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TilesRenderer } from '..';
import { MeshFeaturesMaterialMixin } from './src/MeshFeaturesMaterial';

// const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdAttribute/tileset.json';
const URL = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdTexture/tileset.json';

let camera, controls, scene, renderer;
let dirLight, tiles;
let metadataEl;

let hoveredMaterial = null;
const barycoord = new Vector3();
const triangle = new Triangle();
const pointer = new Vector2();
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

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

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

function animate() {

	requestAnimationFrame( animate );

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.update();

	raycaster.setFromCamera( pointer, camera );

	const hit = raycaster.intersectObject( scene )[ 0 ];
	if ( hit && hit.object.userData.meshFeatures ) {

		const { object, face, point } = hit;
		triangle.setFromAttributeAndIndices( object.geometry.attributes.position, face.a, face.b, face.c );
		triangle.a.applyMatrix4( object.matrixWorld );
		triangle.b.applyMatrix4( object.matrixWorld );
		triangle.c.applyMatrix4( object.matrixWorld );
		triangle.getBarycoord( point, barycoord );

		const meshFeatures = hit.object.userData.meshFeatures;
		const featureInfo = meshFeatures.getFeatureInfo();
		object.material.setFromFeatureInfo( featureInfo[ 0 ], meshFeatures.textures );

		meshFeatures.getFeaturesAsync( hit.faceIndex, barycoord )
			.then( features => {

				if ( object.material === hoveredMaterial ) {

					object.material.highlightFeatureId = features[ 0 ];
					metadataEl.innerText = `feature : ${ features[ 0 ] }`;
					metadataEl.innerText += `\ntextures: ${ renderer.info.memory.textures }`;

				}

			} );


		if ( hoveredMaterial && hoveredMaterial !== object.material ) {

			hoveredMaterial.disableFeatureDisplay();

		}

		hoveredMaterial = object.material;

	} else {

		if ( hoveredMaterial ) {

			hoveredMaterial.disableFeatureDisplay();

		}

		hoveredMaterial = null;
		metadataEl.innerText = 'feature : null';
		metadataEl.innerText += `\ntextures: ${ renderer.info.memory.textures }`;

	}

	renderer.render( scene, camera );

}
