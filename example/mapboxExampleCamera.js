import * as THREE from 'three';

// 512 * 2000
// 512: TILE_SIZE
const WORLD_SIZE = 10240000;
const EARTH_RADIUS = 6371008.8; // from Mapbox  https://github.com/mapbox/mapbox-gl-js/blob/0063cbd10a97218fb6a0f64c99bf18609b918f4c/src/geo/lng_lat.js#L11
const MapConstants = {
	WORLD_SIZE: WORLD_SIZE,
	PROJECTION_WORLD_SIZE: WORLD_SIZE / ( EARTH_RADIUS * Math.PI * 2 ),
	MERCATOR_A: EARTH_RADIUS,
	DEG2RAD: Math.PI / 180,
	EARTH_CIRCUMFERENCE: 2 * Math.PI * EARTH_RADIUS,
	TILE_SIZE: 512,
};

function projectToWorld( coords ) {

	// Spherical mercator forward projection, re-scaling to WORLD_SIZE
	var projected = [
		- MapConstants.MERCATOR_A * MapConstants.DEG2RAD * coords[ 0 ] * MapConstants.PROJECTION_WORLD_SIZE,
		- MapConstants.MERCATOR_A * Math.log( Math.tan( Math.PI * 0.25 + 0.5 * MapConstants.DEG2RAD * coords[ 1 ] ) ) * MapConstants.PROJECTION_WORLD_SIZE,
	];

	// z dimension, defaulting to 0 if not provided
	if ( ! coords[ 2 ] ) projected.push( 0 );
	else {

		var pixelsPerMeter = projectedUnitsPerMeter( coords[ 1 ] );
		projected.push( coords[ 2 ] * pixelsPerMeter );

	}

	var result = new THREE.Vector3( projected[ 0 ], projected[ 1 ], projected[ 2 ] );

	return result;

}

function projectedUnitsPerMeter( latitude ) {

	return Math.abs(
		MapConstants.WORLD_SIZE / Math.cos( MapConstants.DEG2RAD * latitude ) / MapConstants.EARTH_CIRCUMFERENCE );

}

class CameraSync {

	constructor( map, camera, world ) {

		this.map = map;
		this.camera = camera;
		this.active = true;
		// We're in charge of the camera now!
		this.camera.matrixAutoUpdate = false;
		// Postion and configure the world group so we can scale it appropriately when the camera zooms
		this.world = world || new THREE.Group();
		this.world.position.x = this.world.position.y =
    MapConstants.WORLD_SIZE / 2;
		this.world.matrixAutoUpdate = false;
		// set up basic camera state
		this.state = {
			translateCenter: new THREE.Matrix4().makeTranslation(
				MapConstants.WORLD_SIZE / 2,
				- MapConstants.WORLD_SIZE / 2,
				0
			),
			worldSizeRatio: MapConstants.TILE_SIZE / MapConstants.WORLD_SIZE,
		};
		// Listen for move events from the map and update the Three.js camera

		this.map
			.on( 'move', () =>{

				this.updateCamera();

			} )
			.on( 'resize', () =>{

				this.setupCamera();

			} );

		this.setupCamera();

	}

	setupCamera() {

		const t = this.map.transform;
		// if aspect is not reset raycast will fail on map resize
		this.camera.aspect = t.width / t.height;
		this.halfFov = t._fov / 2;
		this.cameraToCenterDistance = ( 0.5 / Math.tan( this.halfFov ) ) * t.height;
		const maxPitch = ( t._maxPitch * Math.PI ) / 180;
		this.acuteAngle = Math.PI / 2 - maxPitch;
		this.updateCamera();

	}

	updateCamera( ev ) {

		if ( ! this.camera ) {

			console.log( 'nocamera' );
			return;

		}

		const t = this.map.transform;

		this.camera.aspect = t.width / t.height;

		this.halfFov = t._fov / 2;
		// pitch seems to influence heavily the depth calculation and cannot be more than 60 = PI/3 < v1 and 85 > v2
		const pitchAngle = Math.cos( Math.PI / 2 - t._pitch );
		this.cameraToCenterDistance = ( 0.5 / Math.tan( this.halfFov ) ) * t.height;

		const worldSize = this.worldSize();

		this.cameraTranslateZ = new THREE.Matrix4().makeTranslation(
			0,
			0,
			this.cameraToCenterDistance
		);
		// someday @ansis set further near plane to fix precision for deckgl,so we should fix it to use mapbox-gl v1.3+ correctly
		// https://github.com/mapbox/mapbox-gl-js/commit/5cf6e5f523611bea61dae155db19a7cb19eb825c#diff-5dddfe9d7b5b4413ee54284bc1f7966d
		const nz = t.height / 50; // min near z as coded by @ansis
		const nearZ = Math.max( nz * pitchAngle, nz ); // on changes in the pitch nz could be too low

		const h = t.height;
		const w = t.width;
		this.camera.projectionMatrix.elements = t._camera.getCameraToClipPerspective(
			t._fov,
			w / h,
			nearZ,
			t._farZ
		);
		// Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
		// If this is applied directly to the projection matrix, it will work OK but break raycasting
		const cameraWorldMatrix = this.calcCameraMatrix( t._pitch, t.angle );
		// When terrain layers are included, height of 3D layers must be modified from t_camera.z * worldSize
		if ( t.elevation )
			cameraWorldMatrix.elements[ 14 ] = t._camera.position[ 2 ] * worldSize;
		// this.camera.matrixWorld.elements is equivalent to t._camera._transform
		this.camera.matrixWorld.copy( cameraWorldMatrix );

		const zoomPow = t.scale * this.state.worldSizeRatio;
		// Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
		const scale = new THREE.Matrix4();
		const translateMap = new THREE.Matrix4();
		const rotateMap = new THREE.Matrix4();

		scale.makeScale( zoomPow, zoomPow, zoomPow );

		const x = t.x || t.point.x;
		const y = t.y || t.point.y;
		translateMap.makeTranslation( - x, y, 0 );
		rotateMap.makeRotationZ( Math.PI );

		this.world.matrix = new THREE.Matrix4()
			.premultiply( rotateMap )
			.premultiply( this.state.translateCenter )
			.premultiply( scale )
			.premultiply( translateMap );

	}

	worldSize() {

		const t = this.map.transform;
		return t.tileSize * t.scale;

	}

	mercatorZfromAltitude( altitude, lat ) {

		return altitude / this.circumferenceAtLatitude( lat );

	}

	circumferenceAtLatitude( latitude ) {

		return (
			MapConstants.EARTH_CIRCUMFERENCE *
      Math.cos( ( latitude * Math.PI ) / 180 )
		);

	}

	calcCameraMatrix( pitch, angle, trz ) {

		const t = this.map.transform;
		const _pitch = pitch === undefined ? t._pitch : pitch;
		const _angle = angle === undefined ? t.angle : angle;
		const _trz = trz === undefined ? this.cameraTranslateZ : trz;

		return new THREE.Matrix4()
			.premultiply( _trz )
			.premultiply( new THREE.Matrix4().makeRotationX( _pitch ) )
			.premultiply( new THREE.Matrix4().makeRotationZ( _angle ) );

	}

}

export { projectToWorld, projectedUnitsPerMeter };

export default CameraSync;
