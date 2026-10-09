/** @import { TilesRenderer } from '3d-tiles-renderer/playcanvas' */
import { Vec3 } from 'playcanvas';
import { OBJECT_FRAME } from '../renderer/math/Ellipsoid.js';
import {
	createMatrix,
	invertMatrix,
	makeRotationX,
	makeRotationZ,
	setIdentity,
	transformPoint,
} from '../renderer/math/MatrixUtils.js';

const _matrix = /* @__PURE__ */ createMatrix();
const _center = /* @__PURE__ */ new Vec3();
const _sphere = { center: /* @__PURE__ */ new Vec3(), radius: 0 };

/**
 * Plugin for automatically re-orienting and re-centering the tileset to make it visible near the
 * origin and facing the right direction. If `lat`/`lon` are provided the tileset is placed at that
 * geographic location; otherwise the plugin tries to determine if the tileset is on the globe
 * surface and estimates the coordinates. If no coordinates can be determined the tileset is
 * oriented so the given `up` axis aligns to +Y.
 *
 * Unlike the three.js plugin of the same name, which transforms the tiles group, this one uses
 * {@link TilesRenderer#setTilesetTransform}, which applies the transform in 64-bit precision, as
 * PlayCanvas entity transforms are 32-bit and cannot cancel out Earth-centered coordinates.
 */
export class ReorientationPlugin {

	/**
	 * @param {Object} [options]
	 * @param {number|null} [options.lat=null] - Latitude in radians of the surface point to orient
	 * to (requires `lon`).
	 * @param {number|null} [options.lon=null] - Longitude in radians of the surface point to orient
	 * to (requires `lat`).
	 * @param {number} [options.height=0] - Height in meters above the ellipsoid surface.
	 * @param {string} [options.up='+z'] - Axis to orient toward +Y when no lat/lon is available.
	 * Valid values are `±x`, `±y`, `±z`.
	 * @param {boolean} [options.recenter=true] - Whether to reposition the tileset to the origin.
	 * @param {number} [options.azimuth=0] - Azimuth rotation in radians.
	 * @param {number} [options.elevation=0] - Elevation rotation in radians.
	 * @param {number} [options.roll=0] - Roll rotation in radians.
	 */
	constructor( options ) {

		options = {
			up: '+z',
			recenter: true,
			lat: null,
			lon: null,
			height: 0,
			azimuth: 0,
			elevation: 0,
			roll: 0,
			...options,
		};

		this.name = 'REORIENTATION_PLUGIN';
		this.tiles = null;

		this.up = options.up.toLowerCase().replace( /\s+/, '' );
		this.lat = options.lat;
		this.lon = options.lon;
		this.height = options.height;
		this.azimuth = options.azimuth;
		this.elevation = options.elevation;
		this.roll = options.roll;
		this.recenter = options.recenter;

		this._callback = null;

	}

	/**
	 * @param {TilesRenderer} tiles
	 */
	init( tiles ) {

		this.tiles = tiles;

		this._callback = () => {

			const { up, lat, lon, height, azimuth, elevation, roll, recenter } = this;

			if ( lat !== null && lon !== null ) {

				// if the latitude and longitude are provided then remove the position offset
				this.transformLatLonHeightToOrigin( lat, lon, height, azimuth, elevation, roll );

			} else {

				const { ellipsoid } = tiles;
				const minRadii = Math.min( ellipsoid.radius.x, ellipsoid.radius.y, ellipsoid.radius.z );
				tiles.root.engineData.boundingVolume.getSphere( _sphere );
				if ( _sphere.center.length() > minRadii * 0.5 ) {

					// otherwise see if this is possibly a tileset on the surface of the globe based on the positioning
					const cart = {};
					ellipsoid.getPositionToCartographic( _sphere.center, cart );
					this.transformLatLonHeightToOrigin( cart.lat, cart.lon, cart.height );

				} else {

					// lastly fall back to orienting the up direction to +Y
					getUpRotation( up, _matrix );
					transformPoint( _matrix, _sphere.center.x, _sphere.center.y, _sphere.center.z, _center );
					_matrix[ 12 ] = - _center.x;
					_matrix[ 13 ] = - _center.y;
					_matrix[ 14 ] = - _center.z;
					tiles.setTilesetTransform( _matrix );

				}

			}

			if ( ! recenter ) {

				tiles.getTilesetTransform( _matrix );
				_matrix[ 12 ] = 0;
				_matrix[ 13 ] = 0;
				_matrix[ 14 ] = 0;
				tiles.setTilesetTransform( _matrix );

			}

			tiles.removeEventListener( 'load-root-tileset', this._callback );

		};

		tiles.addEventListener( 'load-root-tileset', this._callback );

		if ( tiles.root ) {

			this._callback();

		}

	}

	/**
	 * Centers the tileset such that the given coordinates are positioned at the origin with X
	 * facing west and Z facing north.
	 * @param {number} lat - Latitude in radians.
	 * @param {number} lon - Longitude in radians.
	 * @param {number} [height=0] - Height in meters above the ellipsoid surface.
	 * @param {number} [azimuth=0] - Azimuth rotation in radians.
	 * @param {number} [elevation=0] - Elevation rotation in radians.
	 * @param {number} [roll=0] - Roll rotation in radians.
	 */
	transformLatLonHeightToOrigin( lat, lon, height = 0, azimuth = 0, elevation = 0, roll = 0 ) {

		const { tiles } = this;

		// the inverse of the object frame (Y up, Z north) at the location brings it to the origin
		tiles.ellipsoid.getObjectFrame( lat, lon, height, azimuth, elevation, roll, _matrix, OBJECT_FRAME );
		tiles.setTilesetTransform( invertMatrix( _matrix, _matrix ) );

	}

	dispose() {

		const { tiles } = this;
		tiles.setTilesetTransform( setIdentity( _matrix ) );
		tiles.removeEventListener( 'load-root-tileset', this._callback );

	}

}

// the rotation that orients the given axis of the tileset to +Y
function getUpRotation( up, target ) {

	switch ( up ) {

		case 'x': case '+x':
			return makeRotationZ( Math.PI / 2, target );
		case '-x':
			return makeRotationZ( - Math.PI / 2, target );
		case '-y':
			return makeRotationZ( Math.PI, target );
		case 'z': case '+z':
			return makeRotationX( - Math.PI / 2, target );
		case '-z':
			return makeRotationX( Math.PI / 2, target );
		default:
			return setIdentity( target );

	}

}
