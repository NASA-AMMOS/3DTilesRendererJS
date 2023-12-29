import * as THREE from 'three';
import CameraSync, { projectToWorld, projectedUnitsPerMeter } from './mapboxExampleCamera.js';
import { DebugTilesRenderer as TilesRenderer } from '../src/index.js';

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

const origin = [ 116, 35 ];

// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
// This is my private key, it is prohibited to use in the project
window.mapboxgl.accessToken =
        'pk.eyJ1IjoieGlheGlhbmdmbmVnIiwiYSI6ImNscTRzc245NTA5c3cya3BhdXA4MDY0NWQifQ._9T_J9z7Hvcd00nQL3UuSw';
const map = new window.mapboxgl.Map( {
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

			// lights
			const dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
			dirLight.position.set( 1, 2, 3 );
			world.add( dirLight );

			const ambLight = new THREE.AmbientLight( 0xffffff, 1 );
			world.add( ambLight );

			tilesGroup = new THREE.Group();

			world.add( tilesGroup );

			new CameraSync( map, camera, world );

			const url = 'https://xiaxiangfeng.github.io/3DTilesRendererJS.Test/baowei21/tileset.json';

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
				const up = new THREE.Vector3( 0, 1, 0 );
				const rotationToNorthPole = rotationBetweenDirections(
					surfaceDirection,
					up,
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

			const scale = projectedUnitsPerMeter( origin[ 1 ] );
			tilesGroup.scale.set(
			  scale,
			  scale,
			  scale
			);

			tilesGroup.rotation.x = Math.PI / 2;

		},

		render: function ( gl, matrix ) {

			renderer.resetState();
			tiles.update();
			renderer.render( scene, camera );
			map.triggerRepaint();

		},
	} );

} );
