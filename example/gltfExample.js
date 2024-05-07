import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFMeshFeaturesExtension } from '../src/three/gltf/GLTFMeshFeaturesExtension.js';
import { MeshFeaturesMaterial } from './src/MeshFeaturesMaterial.js';

let camera, controls, scene, renderer;
let dirLight;

init();
animate();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 4, 4, 4 );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );

	const ambLight = new AmbientLight( 0xffffff, 0.05 );
	scene.add( ambLight );

	new GLTFLoader()
		.register( parser => new GLTFMeshFeaturesExtension( parser ) )
		// .loadAsync( 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdAttribute/FeatureIdAttribute.gltf' )
		.loadAsync( 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/glTF/EXT_mesh_features/FeatureIdTexture/FeatureIdTexture.gltf' )
		.then( res => {

			console.log( res.scene.children[ 0 ].userData.meshFeatures.getFeatures( 0, new Vector3( 1, 0, 0 ) ) );

			const group = res.scene.children[ 0 ];
			const meshFeatures = group.userData.meshFeatures;
			group.material = new MeshFeaturesMaterial();
			group.material.setFromFeatureInfo( meshFeatures.getFeatureInfo()[ 0 ], meshFeatures.getTextures() );

			// console.log( res );
			scene.add( res.scene );
			console.log( res.scene );

		} );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

}

function animate() {

	requestAnimationFrame( animate );

	render();

}

function render() {

	renderer.render( scene, camera );

}
