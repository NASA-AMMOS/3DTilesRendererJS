/** @import { Camera } from 'three' */
import { Vector3, Matrix4, MathUtils } from 'three';
import { OBB } from '3d-tiles-renderer/three';
import { BaseRegion } from '3d-tiles-renderer/three/plugins';

const _cameraWorld = /* @__PURE__ */ new Vector3();
const _cameraLocal = /* @__PURE__ */ new Vector3();
const _cartographic = { lat: 0, lon: 0, height: 0 };
const _east = /* @__PURE__ */ new Vector3();
const _north = /* @__PURE__ */ new Vector3();
const _up = /* @__PURE__ */ new Vector3();
const _center = /* @__PURE__ */ new Vector3();

const PILLAR_HEIGHT = 3000;

/**
 * A load region shaped as a vertical pillar below the camera, aligned to the globe gravity
 * direction derived from the tile renderer's ellipsoid. Intended for use with LoadRegionPlugin
 * to force higher-quality tile loading directly below the camera, preventing coarse LoD tiles
 * from producing large height discontinuities under the camera (e.g. with Google Photorealistic
 * Tiles)
 *
 * @param {Object} [options]
 * @param {Camera} options.camera The camera whose position drives the pillar placement.
 * @param {number} [options.radius=1000] Half-width of the pillar in world units.
 * @param {number} [options.errorTarget=10] Geometric error target for tiles inside the region.
 */
export class CameraCartographicRegion extends BaseRegion {

	constructor( options = {} ) {

		const {
			camera,
			radius = 1000,
			...rest
		} = options;

		super( rest );

		this.camera = camera;
		this.radius = radius;

		this.obb = new OBB();
		this._cameraMatrix = new Matrix4();
		this._localCameraPos = new Vector3();
		this._localUp = new Vector3();

	}

	calculateDistance( boundingVolume ) {

		return boundingVolume.distanceToPoint( this._localCameraPos );

	}

	calculateError( tile, tilesRenderer ) {

		// calculate the error so it drops off with distance to enable progressive loading
		this._updateOBB( tilesRenderer );

		const boundingVolume = tile.engineData.boundingVolume;
		const dist = boundingVolume.distanceToPoint( this._localCameraPos );
		const t = Math.min( dist / this.radius, 1 );

		const minTarget = tile.geometricError - this.errorTarget + tilesRenderer.errorTarget;
		const maxTarget = tile.geometricError - this.errorTarget * 5 + tilesRenderer.errorTarget;
		return MathUtils.lerp( minTarget, maxTarget, t );

	}

	intersectsTile( boundingVolume, tile, tilesRenderer ) {

		// update the obb and check the intersection with the tile bounding volume
		this._updateOBB( tilesRenderer );

		const { obb } = this;
		return boundingVolume.intersectsOBB( obb );

	}

	_updateOBB( tilesRenderer ) {

		// update the OBB to live below the camera position toward the globe surface
		const { camera, radius, obb } = this;
		if ( ! camera.matrixWorld.equals( this._cameraMatrix ) ) {

			const { ellipsoid, group } = tilesRenderer;

			// Transform camera world position into the tile renderer's local (ellipsoid) space
			camera.getWorldPosition( _cameraWorld );
			_cameraLocal.copy( _cameraWorld ).applyMatrix4( group.matrixWorldInverse );
			this._localCameraPos.copy( _cameraLocal );

			// Get the geodetic ENU axes at the camera's position on the ellipsoid
			ellipsoid.getPositionToCartographic( _cameraLocal, _cartographic );
			ellipsoid.getEastNorthUpAxes( _cartographic.lat, _cartographic.lon, _east, _north, _up );
			this._localUp.copy( _up );

			// Pillar center: camera local position shifted half-depth downward (nadir = -up)
			_center.copy( _cameraLocal ).addScaledVector( _up, - PILLAR_HEIGHT / 2 );

			// OBB transform: east/north/nadir as X/Y/Z column axes
			obb.transform.set(
				_east.x, _north.x, - _up.x, _center.x,
				_east.y, _north.y, - _up.y, _center.y,
				_east.z, _north.z, - _up.z, _center.z,
				0, 0, 0, 1,
			);

			obb.box.min.set( - radius, - radius, - PILLAR_HEIGHT / 2 );
			obb.box.max.set( radius, radius, PILLAR_HEIGHT / 2 );

			obb.update();
			this._cameraMatrix.copy( camera.matrixWorld );

		}

	}

}
