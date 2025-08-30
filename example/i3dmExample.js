import { I3DMLoader } from '3d-tiles-renderer';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	PCFSoftShadowMap,
	Vector3,
	Quaternion,
	Raycaster,
	Vector2,
	Matrix4,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let camera, controls, scene, renderer;
let dirLight;
let raycaster, mouse;
let infoEl;

init();
animate();

function init() {

	infoEl = document.getElementById( 'hover-info' );

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x151c1f );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFSoftShadowMap;

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

	const i3dmLoader = new I3DMLoader();

	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );
	const gltfLoader = new GLTFLoader( i3dmLoader.manager );
	gltfLoader.setDRACOLoader( dracoLoader );
	i3dmLoader.manager.addHandler( /\.gltf$/, gltfLoader );

	i3dmLoader.loadAsync( 'https://3d.geo.admin.ch/ch.swisstopo.vegetation.3d/v1/20250728/10/200/330.i3dm' )
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

	raycaster = new Raycaster();
	mouse = new Vector2();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );

}

function onMouseMove( e ) {

	const bounds = this.getBoundingClientRect();
	mouse.x = e.clientX - bounds.x;
	mouse.y = e.clientY - bounds.y;
	mouse.x = ( mouse.x / bounds.width ) * 2 - 1;
	mouse.y = - ( mouse.y / bounds.height ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );

	// Get the batch table data
	const intersects = raycaster.intersectObject( scene );
	let hoveredInstanceId = - 1;
	if ( intersects.length > 0 ) {

		const { object, instanceId } = intersects[ 0 ];

		if ( instanceId ) {

			hoveredInstanceId = instanceId;

			// Traverse the parents to find the batch table.
			let batchTableObject = object;
			while ( ! batchTableObject.batchTable ) {

				batchTableObject = batchTableObject.parent;

			}

			// Log the batch data
			const batchTable = batchTableObject.batchTable;
			const batchData = batchTable.getDataFromId( hoveredInstanceId );
			const hierarchyData = batchData[ '3DTILES_batch_table_hierarchy' ];

			const batchTableKeys = batchTable.getKeys();
			infoEl.innerText = `${ '_batchid'.padEnd( 15 ) }: ${ hoveredInstanceId }\n`;
			for ( const key of batchTableKeys ) {

				infoEl.innerText += `${ key.padEnd( 15 ) }: ${ batchData[ key ] }\n`;

			}

			for ( const className in hierarchyData ) {

				for ( const instance in hierarchyData[ className ] ) {

					infoEl.innerText +=
						`${ instance.padEnd( 15 ) } : ${ hierarchyData[ className ][ instance ] }\n`;

				}

			}

		}

	} else {

		infoEl.innerText = '';

	}

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
