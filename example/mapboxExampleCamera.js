import * as THREE from 'three';

const utils = {
	clamp: function ( n, min, max ) {

		return Math.min( max, Math.max( min, n ) );

	},
	makePerspectiveMatrix: function ( fovy, aspect, near, far ) {

		var out = new THREE.Matrix4();
		var f = 1.0 / Math.tan( fovy / 2 ),
			nf = 1 / ( near - far );
		var newMatrix = [
			f / aspect,
			0,
			0,
			0,
			0,
			f,
			0,
			0,
			0,
			0,
			( far + near ) * nf,
			- 1,
			0,
			0,
			2 * far * near * nf,
			0,
		];

		out.elements = newMatrix;
		return out;

	},
};

const WORLD_SIZE = 10240000;
const FOV_ORTHO = ( 0.1 / 180 ) * Math.PI;
const FOV = Math.atan( 3 / 4 );
const EARTH_RADIUS = 6371008.8;
const EARTH_CIRCUMFERENCE_EQUATOR = 40075017;
const MapConstants = {
	WORLD_SIZE: WORLD_SIZE,
	PROJECTION_WORLD_SIZE: WORLD_SIZE / ( EARTH_RADIUS * Math.PI * 2 ),
	MERCATOR_A: EARTH_RADIUS,
	DEG2RAD: Math.PI / 180,
	RAD2DEG: 180 / Math.PI,
	EARTH_RADIUS: EARTH_RADIUS,
	EARTH_CIRCUMFERENCE: 2 * Math.PI * EARTH_RADIUS,
	EARTH_CIRCUMFERENCE_EQUATOR: EARTH_CIRCUMFERENCE_EQUATOR,
	FOV_ORTHO: FOV_ORTHO,
	FOV: FOV,
	FOV_DEGREES: ( FOV * 180 ) / Math.PI,
	TILE_SIZE: 512,
};

const Constants = MapConstants;

function projectToWorld( coords ) {

	var projected = [
		- Constants.MERCATOR_A *
      Constants.DEG2RAD *
      coords[ 0 ] *
      Constants.PROJECTION_WORLD_SIZE,
		- Constants.MERCATOR_A *
      Math.log( Math.tan( Math.PI * 0.25 + 0.5 * Constants.DEG2RAD * coords[ 1 ] ) ) *
      Constants.PROJECTION_WORLD_SIZE,
	];

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
		Constants.WORLD_SIZE /
      Math.cos( Constants.DEG2RAD * latitude ) /
      Constants.EARTH_CIRCUMFERENCE
	);

}

class CameraSync {

	constructor( map, camera, world ) {

		this.map = map;
		this.camera = camera;
		this.active = true;

		this.camera.matrixAutoUpdate = false;

		this.world = world || new THREE.Group();
		this.world.position.x = this.world.position.y =
    MapConstants.WORLD_SIZE / 2;
		this.world.matrixAutoUpdate = false;

		this.state = {
			translateCenter: new THREE.Matrix4().makeTranslation(
				MapConstants.WORLD_SIZE / 2,
				- MapConstants.WORLD_SIZE / 2,
				0
			),
			worldSizeRatio: MapConstants.TILE_SIZE / MapConstants.WORLD_SIZE,
			worldSize: MapConstants.TILE_SIZE * this.map.transform.scale,
		};

		const _this = this;
		this.map
			.on( 'move', function () {

				_this.updateCamera();

			} )
			.on( 'resize', function () {

				_this.setupCamera();

			} );

		this.setupCamera();

	}

	setupCamera() {

		const t = this.map.transform;
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
		let farZ = 0;
		let furthestDistance = 0;
		this.halfFov = t._fov / 2;
		const groundAngle = Math.PI / 2 + t._pitch;
		const pitchAngle = Math.cos( Math.PI / 2 - t._pitch );
		this.cameraToCenterDistance = ( 0.5 / Math.tan( this.halfFov ) ) * t.height;

		let pixelsPerMeter = 1;
		const worldSize = this.worldSize();

		pixelsPerMeter = this.mercatorZfromAltitude( 1, t.center.lat ) * worldSize;
		const fovAboveCenter = t._fov * ( 0.5 + t.centerOffset.y / t.height );


		const minElevationInPixels = t.elevation
			? t.elevation.getMinElevationBelowMSL() * pixelsPerMeter
			: 0;

		const cameraToSeaLevelDistance =
      ( t._camera.position[ 2 ] * worldSize - minElevationInPixels ) /
      Math.cos( t._pitch );

		const topHalfSurfaceDistance =
      ( Math.sin( fovAboveCenter ) * cameraToSeaLevelDistance ) /
      Math.sin(
      	utils.clamp(
      		Math.PI - groundAngle - fovAboveCenter,
      		0.01,
      		Math.PI - 0.01
      	)
      );


		furthestDistance =
      pitchAngle * topHalfSurfaceDistance + cameraToSeaLevelDistance;

		const horizonDistance = cameraToSeaLevelDistance * ( 1 / t._horizonShift );
		farZ = Math.min( furthestDistance * 1.01, horizonDistance );

		this.cameraTranslateZ = new THREE.Matrix4().makeTranslation(
			0,
			0,
			this.cameraToCenterDistance
		);

		const nz = t.height / 50;
		const nearZ = Math.max( nz * pitchAngle, nz );

		const h = t.height;
		const w = t.width;
		this.camera.projectionMatrix = utils.makePerspectiveMatrix(
			t._fov,
			w / h,
			nearZ,
			farZ
		);

		const cameraWorldMatrix = this.calcCameraMatrix( t._pitch, t.angle );

		if ( t.elevation )
			cameraWorldMatrix.elements[ 14 ] = t._camera.position[ 2 ] * worldSize;

		this.camera.matrixWorld.copy( cameraWorldMatrix );

		const zoomPow = t.scale * this.state.worldSizeRatio;
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
