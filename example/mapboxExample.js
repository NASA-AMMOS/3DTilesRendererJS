import * as THREE from 'three';
import CameraSync, {
	projectToWorld,
	projectedUnitsPerMeter,
} from './mapboxExampleCamera.js';
import { DebugTilesRenderer as TilesRenderer } from '../src/index.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

// To use any of Mapbox's tools, APIs, or SDKs, you'll need a Mapbox access token
// https://docs.mapbox.com/help/getting-started/access-tokens/
const params = {

	'accessToken': 'put-your-api-key-here',
	'reload': reload,

};

// GUI
const gui = new GUI();
gui.width = 300;

const mapboxglOptions = gui.addFolder( 'mapboxgl' );
mapboxglOptions.add( params, 'accessToken' );
mapboxglOptions.add( params, 'reload' );
mapboxglOptions.open();

function rotationBetweenDirections( dir1, dir2 ) {

	const rotation = new THREE.Quaternion();
	const a = new THREE.Vector3().crossVectors( dir1, dir2 );
	rotation.x = a.x;
	rotation.y = a.y;
	rotation.z = a.z;
	rotation.w = 1 + dir1.clone().dot( dir2 );
	rotation.normalize();

	return rotation;

}

let map;
const origin = [ 116, 35 ];

init();

function init() {

	// TO MAKE THE MAP APPEAR YOU MUST
	// ADD YOUR ACCESS TOKEN FROM
	// https://account.mapbox.com
	window.mapboxgl.accessToken = params.accessToken;
	map = new window.mapboxgl.Map( {
		container: 'map',
		style: 'mapbox://styles/mapbox/dark-v9',
		zoom: 17.86614600777933,
		pitch: 70,
		bearing: - 40,
		center: origin,
	} );

	map.on( 'load', () => {

		let renderer, scene, camera, world, tiles, tilesGroup;

		map.addLayer( {
			id: 'custom_layer',
			type: 'custom',
			onAdd: function ( map, mbxContext ) {

				renderer = new THREE.WebGLRenderer( {
					alpha: true,
					antialias: true,
					canvas: map.getCanvas(),
					context: mbxContext,
				} );

				renderer.shadowMap.enabled = true;
				renderer.autoClear = false;

				scene = new THREE.Scene();
				camera = new THREE.Camera();

				world = new THREE.Group();
				scene.add( world );

				tilesGroup = new THREE.Group();

				world.add( tilesGroup );

				// Synchronize Camera change information to Threejs
				new CameraSync( map, camera, world );

				const url = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

				tiles = new TilesRenderer( url );

				tiles.setCamera( camera );
				tiles.setResolutionFromRenderer( camera, renderer );

				tiles.onLoadTileSet = ( tileset ) => {

					const box = new THREE.Box3();
					const sphere = new THREE.Sphere();
					const matrix = new THREE.Matrix4();

					let position;
					let distanceToEllipsoidCenter;

					if ( tiles.getOrientedBounds( box, matrix ) ) {

						position = new THREE.Vector3().setFromMatrixPosition( matrix );
						distanceToEllipsoidCenter = position.length();

					} else if ( tiles.getBoundingSphere( sphere ) ) {

						position = sphere.center.clone();
						distanceToEllipsoidCenter = position.length();

					}

					const surfaceDirection = position.normalize();
					const up = new THREE.Vector3( 0, 0, 0 );
					const rotationToNorthPole = rotationBetweenDirections(
						surfaceDirection,
						up
					);

					tiles.group.quaternion.x = rotationToNorthPole.x;
					tiles.group.quaternion.y = rotationToNorthPole.y;
					tiles.group.quaternion.z = rotationToNorthPole.z;
					tiles.group.quaternion.w = rotationToNorthPole.w;

					tiles.group.position.y = - distanceToEllipsoidCenter;

				};

				tilesGroup.add( tiles.group );

				const pos = projectToWorld( origin );
				tilesGroup.position.copy( pos );
				tilesGroup.position.z = 1;

				// Since the 3D model is in real world meters, a scale transform needs to be
				// applied since the CustomLayerInterface expects units in MercatorCoordinates.
				const scale = projectedUnitsPerMeter( origin[ 1 ] );
				tilesGroup.scale.set( scale, scale, scale );

				tilesGroup.rotation.x = Math.PI;

			},

			render: function ( gl, matrix ) {

				renderer.resetState();

				// update tiles
				camera.updateMatrixWorld();
				tiles.update();

				renderer.render( scene, camera );
				map.triggerRepaint();

			},
		} );

	} );

}

function reload() {

	map.remove();
	init();

}
