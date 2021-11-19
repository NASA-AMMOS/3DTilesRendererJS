import { I3DMLoader } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	sRGBEncoding,
	PCFSoftShadowMap,
	Vector3,
	Quaternion,
	Matrix4,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFSoftShadowMap;
	renderer.outputEncoding = sRGBEncoding;

	document.body.appendChild( renderer.domElement );

	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.set( 100, 100, 100 );

	// controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.screenSpacePanning = false;
	controls.minDistance = 1;
	controls.maxDistance = 2000;

	// lights
	dirLight = new DirectionalLight( 0xffffff, 1.25 );
	dirLight.position.set( 1, 2, 3 ).multiplyScalar( 40 );
	dirLight.castShadow = true;
	dirLight.shadow.bias = - 0.01;
	dirLight.shadow.mapSize.setScalar( 2048 );

	const shadowCam = dirLight.shadow.camera;
	shadowCam.left = - 200;
	shadowCam.bottom = - 200;
	shadowCam.right = 200;
	shadowCam.top = 200;
	shadowCam.updateProjectionMatrix();

	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.05 );
	scene.add( ambLight );

	new I3DMLoader()
		.load( 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/1.0/TilesetWithTreeBillboards/tree.i3dm' )
		.then( res => {

			let instance = null;
			res.scene.traverse( c => {

				if ( ! instance && c.isInstancedMesh ) {

					instance = c;

				}

			} );

			if ( instance ) {

				res.scene.updateMatrixWorld( true );

				const pos = new Vector3();
				const quat = new Quaternion();
				const sca = new Vector3();
				const mat = new Matrix4();
				const averagePos = new Vector3();

				for ( let i = 0, l = instance.count; i < l; i ++ ) {

					instance.getMatrixAt( i, mat );
					mat.premultiply( instance.matrixWorld );
					mat.decompose( pos, quat, sca );
					averagePos.add( pos );

				}

				averagePos.divideScalar( instance.count );
				controls.target.copy( averagePos );
				camera.position.add( averagePos );
				controls.update();

			}

			console.log( res );
			scene.add( res.scene );

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
