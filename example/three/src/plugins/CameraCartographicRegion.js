import { Vector3 } from 'three';
import { OBB } from '3d-tiles-renderer/three';
import { BaseRegion } from '3d-tiles-renderer/three/plugins';

const _cameraWorld = /* @__PURE__ */ new Vector3();
const _cameraLocal = /* @__PURE__ */ new Vector3();
const _cartographic = { lat: 0, lon: 0, height: 0 };
const _east = /* @__PURE__ */ new Vector3();
const _north = /* @__PURE__ */ new Vector3();
const _up = /* @__PURE__ */ new Vector3();
const _center = /* @__PURE__ */ new Vector3();
const _obb = /* @__PURE__ */ new OBB();

/**
 * A load region shaped as a vertical pillar below the camera, aligned to the geodetic nadir
 * direction derived from the tile renderer's ellipsoid. Intended for use with LoadRegionPlugin
 * to force high-quality tile loading directly below the camera, preventing coarse LoD tiles
 * from producing large height discontinuities under the camera.
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

	}

	// calculateDistance( boundingVolume, tile ) {

	// 	const { group } = tile.internal.renderer;
	// 	this.camera.getWorldPosition( _cameraWorld );
	// 	_cameraLocal.copy( _cameraWorld ).applyMatrix4( group.matrixWorldInverse );
	// 	return boundingVolume.distanceToPoint( _cameraLocal );

	// }

	intersectsTile( boundingVolume, tile ) {

		const { camera, radius } = this;
		const depth = 1e7;
		const { ellipsoid, group } = tile.internal.renderer;

		// Transform camera world position into the tile renderer's local (ellipsoid) space
		camera.getWorldPosition( _cameraWorld );
		_cameraLocal.copy( _cameraWorld ).applyMatrix4( group.matrixWorldInverse );

		// Get the geodetic ENU axes at the camera's position on the ellipsoid
		ellipsoid.getPositionToCartographic( _cameraLocal, _cartographic );
		ellipsoid.getEastNorthUpAxes( _cartographic.lat, _cartographic.lon, _east, _north, _up );

		// Pillar center: camera local position shifted half-depth downward (nadir = -up)
		_center.copy( _cameraLocal ).addScaledVector( _up, - depth / 2 );

		// OBB transform: east/north/nadir as X/Y/Z column axes
		_obb.transform.set(
			_east.x, _north.x, - _up.x, _center.x,
			_east.y, _north.y, - _up.y, _center.y,
			_east.z, _north.z, - _up.z, _center.z,
			0, 0, 0, 1,
		);

		_obb.box.min.set( - radius, - radius, - depth / 2 );
		_obb.box.max.set( radius, radius, depth / 2 );

		_obb.update();

		return boundingVolume.intersectsOBB( _obb );

	}

}
