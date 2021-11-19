import { B3DMLoader } from '../src/index.js';
import {
	Scene,
	Group,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	sRGBEncoding,
	PCFSoftShadowMap,
	Vector2,
	Raycaster,
	ShaderLib,
	UniformsUtils,
	ShaderMaterial,
	Color,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let camera, controls, scene, renderer, offsetGroup;
let dirLight;
let raycaster, mouse;
let model;
let infoEl;

init();
animate();

// Adjusts the three.js standard shader to include batchid highlight
function batchIdHighlightShaderMixin( shader ) {

	const newShader = { ...shader };
	newShader.uniforms = {
		highlightedBatchId: { value: - 1 },
		highlightColor: { value: new Color( 0xFFC107 ).convertSRGBToLinear() },
		...UniformsUtils.clone( shader.uniforms ),
	};
	newShader.extensions = {
		derivatives: true,
	};
	newShader.lights = true;
	newShader.vertexShader =
		`
			attribute float _batchid;
			varying float batchid;
		` +
		newShader.vertexShader.replace(
			/#include <uv_vertex>/,
			`
			#include <uv_vertex>
			batchid = _batchid;
			`
		);
	newShader.fragmentShader =
		`
			varying float batchid;
			uniform float highlightedBatchId;
			uniform vec3 highlightColor;
		` +
		newShader.fragmentShader.replace(
			/vec4 diffuseColor = vec4\( diffuse, opacity \);/,
			`
			vec4 diffuseColor =
				abs( batchid - highlightedBatchId ) < 0.5 ?
				vec4( highlightColor, opacity ) :
				vec4( diffuse, opacity );
			`
		);

	return newShader;

}

function init() {

	infoEl = document.getElementById( 'info' );

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
	camera.position.set( 400, 400, 400 );

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

	offsetGroup = new Group();
	scene.add( offsetGroup );

	new B3DMLoader()
		.load( 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/1.0/TilesetWithRequestVolume/city/lr.b3dm' )
		.then( res => {

			console.log( res );
			model = res.scene;
			offsetGroup.add( model );

			const box = new Box3();
			box.setFromObject( model );
			box.getCenter( offsetGroup.position ).multiplyScalar( - 1 );


			// reassign the material to use the batchid highlight variant.
			// in practice this should copy over any needed uniforms from the
			// original material.
			model.traverse( c => {

				if ( c.isMesh ) {

					c.material = new ShaderMaterial( batchIdHighlightShaderMixin( ShaderLib.standard ) );

				}

			} );

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
	const intersects = raycaster.intersectObject( scene, true );
	let hoveredBatchid = - 1;
	if ( intersects.length ) {

		const { face, object } = intersects[ 0 ];
		const batchidAttr = object.geometry.getAttribute( '_batchid' );

		if ( batchidAttr ) {

			// Traverse the parents to find the batch table.
			let batchTableObject = object;
			while ( ! batchTableObject.batchTable ) {

				batchTableObject = batchTableObject.parent;

			}

			// Log the batch data
			const batchTable = batchTableObject.batchTable;
			hoveredBatchid = batchidAttr.getX( face.a );

			infoEl.innerText =
				`_batchid   : ${ hoveredBatchid }\n` +
				`Latitude   : ${ batchTable.getData( 'Latitude' )[ hoveredBatchid ].toFixed( 3 ) }\n` +
				`Longitude  : ${ batchTable.getData( 'Longitude' )[ hoveredBatchid ].toFixed( 3 ) }\n` +
				`Height     : ${ batchTable.getData( 'Height' )[ hoveredBatchid ].toFixed( 3 ) }\n`;

		}

	} else {

		infoEl.innerText = '';

	}

	if ( model ) {

		model.traverse( c => {

			if ( c.isMesh ) {

				c.material.uniforms.highlightedBatchId.value = hoveredBatchid;

			}

		} );

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
