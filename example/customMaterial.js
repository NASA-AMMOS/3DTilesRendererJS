import { TilesRenderer } from '../src/index.js';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	OrthographicCamera,
	sRGBEncoding,
	Group,
	ShaderMaterial,
	MeshStandardMaterial,
	PCFSoftShadowMap,
	Sphere,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let camera, controls, scene, renderer, tiles, orthoCamera;
let offsetParent, box, sphere, dirLight, statsContainer;
let stats;

const DEFAULT = 0;
const GRADIENT = 1;
const TOPOGRAPHIC_LINES = 2;
const LIGHTING = 3;
const params = {

	'material': DEFAULT,
	'orthographic': false,
	'rebuild': initTiles,

};

const gradientShader = {
	vertexShader: /* glsl */`
		varying vec3 wPosition;
		void main() {

			#include <begin_vertex>
			#include <project_vertex>
			wPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;

		}
	`,
	fragmentShader: /* glsl */`
		varying vec3 wPosition;
		void main() {

			float minVal = - 30.0;
			float maxVal = 30.0;

			float val = ( wPosition.y - minVal ) / ( maxVal - minVal );

			vec4 color1 = vec4( 0.149, 0.196, 0.219, 1.0 ) * 0.5;
			vec4 color2 = vec4( 1.0 );

			gl_FragColor = mix( color1, color2, val );

		}
	`,

};

const topoShader = {
	extensions: {
		derivatives: true,
	},
	vertexShader: /* glsl */`
		varying vec3 wPosition;
		varying vec3 vViewPosition;
		void main() {

			#include <begin_vertex>
			#include <project_vertex>
			wPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
			vViewPosition = - mvPosition.xyz;

		}
	`,
	fragmentShader: /* glsl */`
		varying vec3 wPosition;
		varying vec3 vViewPosition;
		void main() {

			// lighting
			vec3 fdx = vec3( dFdx( wPosition.x ), dFdx( wPosition.y ), dFdx( wPosition.z ) );
			vec3 fdy = vec3( dFdy( wPosition.x ), dFdy( wPosition.y ), dFdy( wPosition.z ) );
			vec3 worldNormal = normalize( cross( fdx, fdy ) );

			float lighting =
				0.4 +
				clamp( dot( worldNormal, vec3( 1.0, 1.0, 1.0 ) ), 0.0, 1.0 ) * 0.5 +
				clamp( dot( worldNormal, vec3( - 1.0, 1.0, - 1.0 ) ), 0.0, 1.0 ) * 0.3;

			// thickness scale
			float upwardness = dot( worldNormal, vec3( 0.0, 1.0, 0.0 ) );
			float yInv = clamp( 1.0 - abs( upwardness ), 0.0, 1.0 );
			float thicknessScale = pow( yInv, 0.4 );
			thicknessScale *= 0.25 + 0.5 * ( vViewPosition.z + 1.0 ) / 2.0;

			// thickness
			float thickness = 0.01 * thicknessScale;
			float thickness2 = thickness / 2.0;
			float m = mod( wPosition.y, 3.0 );

			// soften edge
			float center = thickness2;
			float dist = clamp( abs( m - thickness2 ) / thickness2, 0.0, 1.0 );

			vec4 topoColor = vec4( 0.149, 0.196, 0.219, 1.0 ) * 0.5;
			gl_FragColor = mix( topoColor * lighting, vec4( lighting ), dist );

		}
	`,

};

init();
animate();

function updateMaterial( scene ) {

	const materialIndex = parseFloat( params.material );
	scene.traverse( c => {

		if ( c.isMesh ) {

			c.material.dispose();
			switch ( materialIndex ) {

				case DEFAULT:
					c.material = c.originalMaterial;
					c.material.side = 2;
					c.receiveShadow = false;
					c.castShadow = false;
					break;
				case GRADIENT:
					c.material = new ShaderMaterial( gradientShader );
					c.material.side = 2;
					c.receiveShadow = false;
					c.castShadow = false;
					break;
				case TOPOGRAPHIC_LINES:
					c.material = new ShaderMaterial( topoShader );
					c.material.side = 2;
					c.material.flatShading = true;
					c.receiveShadow = false;
					c.castShadow = false;
					break;
				case LIGHTING:
					c.material = new MeshStandardMaterial();
					c.material.side = 2;
					c.receiveShadow = true;
					c.castShadow = true;

			}


		}

	} );

}

function onLoadModel( scene ) {

	scene.traverse( c => {

		if ( c.isMesh ) {

			c.originalMaterial = c.material;

		}

	} );

	updateMaterial( scene );

}

function onDisposeModel( scene ) {

	scene.traverse( c => {

		if ( c.isMesh ) {

			c.material.dispose();

		}

	} );

}

function initTiles() {

	if ( tiles ) {

		tiles.group.parent.remove( tiles.group );
		tiles.dispose();

	}

	const url = window.location.hash.replace( /^#/, '' ) || '../data/tileset.json';
	tiles = new TilesRenderer( url );
	tiles.errorTarget = 2;
	tiles.onLoadModel = onLoadModel;
	tiles.onDisposeModel = onDisposeModel;
	offsetParent.add( tiles.group );

}

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
	camera.position.set( 400, 400, 400 );

	orthoCamera = new OrthographicCamera();

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

	box = new Box3();
	sphere = new Sphere();

	offsetParent = new Group();
	scene.add( offsetParent );

	initTiles();

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

	// GUI
	const gui = new GUI();
	gui.width = 300;
	gui.add( params, 'orthographic' );
	gui.add( params, 'material', { DEFAULT, GRADIENT, TOPOGRAPHIC_LINES, LIGHTING } )
		.onChange( () => {

			tiles.forEachLoadedModel( updateMaterial );

		} );
	gui.add( params, 'rebuild' );
	gui.open();

	// Stats
	stats = new Stats();
	stats.showPanel( 0 );
	document.body.appendChild( stats.dom );

	statsContainer = document.createElement( 'div' );
	statsContainer.style.position = 'absolute';
	statsContainer.style.top = 0;
	statsContainer.style.left = 0;
	statsContainer.style.color = 'white';
	statsContainer.style.width = '100%';
	statsContainer.style.textAlign = 'center';
	statsContainer.style.padding = '5px';
	statsContainer.style.pointerEvents = 'none';
	statsContainer.style.lineHeight = '1.5em';
	document.body.appendChild( statsContainer );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.updateProjectionMatrix();

	updateOrthoCamera();

}

function updateOrthoCamera() {

	orthoCamera.position.copy( camera.position );
	orthoCamera.rotation.copy( camera.rotation );

	const scale = camera.position.distanceTo( controls.target ) / 2.0;
	const aspect = window.innerWidth / window.innerHeight;
	orthoCamera.left = - aspect * scale;
	orthoCamera.right = aspect * scale;
	orthoCamera.bottom = - scale;
	orthoCamera.top = scale;
	orthoCamera.near = camera.near;
	orthoCamera.far = camera.far;
	orthoCamera.updateProjectionMatrix();

}

function animate() {

	requestAnimationFrame( animate );

	if ( params.orthographic ) {

		tiles.deleteCamera( camera );
		tiles.setCamera( orthoCamera );
		tiles.setResolutionFromRenderer( orthoCamera, renderer );

	} else {

		tiles.deleteCamera( orthoCamera );
		tiles.setCamera( camera );
		tiles.setResolutionFromRenderer( camera, renderer );

	}

	offsetParent.rotation.set( 0, 0, 0 );
	if ( params.up === '-Z' ) {

		offsetParent.rotation.x = Math.PI / 2;

	}
	offsetParent.updateMatrixWorld( true );

	// update tiles center
	if ( tiles.getBounds( box ) ) {

		box.getCenter( tiles.group.position );
		tiles.group.position.multiplyScalar( - 1 );

	} else if ( tiles.getBoundingSphere( sphere ) ) {

		tiles.group.position.copy( sphere.center );
		tiles.group.position.multiplyScalar( - 1 );

	}

	// update tiles
	window.tiles = tiles;
	camera.updateMatrixWorld();
	orthoCamera.updateMatrixWorld();
	tiles.update();

	render();
	stats.update();

}

function render() {

	updateOrthoCamera();

	statsContainer.innerText =
		`Geometries: ${ renderer.info.memory.geometries } ` +
		`Textures: ${ renderer.info.memory.textures } ` +
		`Programs: ${ renderer.info.programs.length } `;

	renderer.render( scene, params.orthographic ? orthoCamera : camera );

}
