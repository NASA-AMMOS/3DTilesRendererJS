import { Sphere } from 'three';
import { OBJECT_FRAME } from '3d-tiles-renderer/three';

const sphere = /* @__PURE__ */ new Sphere();

/**
 * Plugin for automatically re-orienting and re-centering the tileset to make it visible
 * near the origin and facing the right direction. If `lat`/`lon` are provided the
 * tileset is placed at that geographic location; otherwise the plugin tries to determine
 * if the tileset is on the globe surface and estimates the coordinates. If no coordinates
 * can be determined the tileset is oriented so the given `up` axis aligns to three.js' +Y.
 * @param {Object} [options]
 * @param {number|null} [options.lat=null] Latitude in radians of the surface point to orient to (requires `lon`).
 * @param {number|null} [options.lon=null] Longitude in radians of the surface point to orient to (requires `lat`).
 * @param {number} [options.height=0] Height in metres above the ellipsoid surface.
 * @param {string} [options.up='+z'] Axis to orient toward three.js +Y when no lat/lon is available. Valid values are `±x`, `±y`, `±z`.
 * @param {boolean} [options.recenter=true] Whether to reposition the tileset to the origin.
 * @param {number} [options.azimuth=0] Azimuth rotation in radians.
 * @param {number} [options.elevation=0] Elevation rotation in radians.
 * @param {number} [options.roll=0] Roll rotation in radians.
 */
export class ReorientationPlugin {

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

	init( tiles ) {

		this.tiles = tiles;

		this._callback = () => {

			const { up, lat, lon, height, azimuth, elevation, roll, recenter } = this;

			if ( lat !== null && lon !== null ) {

				// if the latitude and longitude are provided then remove the position offset
				this.transformLatLonHeightToOrigin( lat, lon, height, azimuth, elevation, roll );

			} else {

				const { ellipsoid } = tiles;
				const minRadii = Math.min( ...ellipsoid.radius );
				tiles.getBoundingSphere( sphere );
				if ( sphere.center.length() > minRadii * 0.5 ) {

					// otherwise see if this is possibly a tileset on the surface of the globe based on the positioning
					const cart = {};
					ellipsoid.getPositionToCartographic( sphere.center, cart );
					this.transformLatLonHeightToOrigin( cart.lat, cart.lon, cart.height );

				} else {

					// lastly fall back to orienting the up direction to +Y
					const group = tiles.group;
					group.rotation.set( 0, 0, 0 );
					switch ( up ) {

						case 'x': case '+x':
							group.rotation.z = Math.PI / 2;
							break;
						case '-x':
							group.rotation.z = - Math.PI / 2;
							break;

						case 'y': case '+y':
							break;
						case '-y':
							group.rotation.z = Math.PI;
							break;

						case 'z': case '+z':
							group.rotation.x = - Math.PI / 2;
							break;
						case '-z':
							group.rotation.x = Math.PI / 2;
							break;

					}

					tiles.group.position
						.copy( sphere.center )
						.applyEuler( group.rotation )
						.multiplyScalar( - 1 );

				}

			}

			if ( ! recenter ) {

				tiles.group.position.setScalar( 0 );

			}

			tiles.removeEventListener( 'load-root-tileset', this._callback );

		};

		tiles.addEventListener( 'load-root-tileset', this._callback );

		if ( tiles.root ) {

			this._callback();

		}

	}

	/**
	 * Centers the tileset such that the given coordinates are positioned at the origin
	 * with X facing west and Z facing north.
	 * @param {number} lat Latitude in radians.
	 * @param {number} lon Longitude in radians.
	 * @param {number} [height=0] Height in metres above the ellipsoid surface.
	 * @param {number} [azimuth=0] Azimuth rotation in radians.
	 * @param {number} [elevation=0] Elevation rotation in radians.
	 * @param {number} [roll=0] Roll rotation in radians.
	 */
	transformLatLonHeightToOrigin( lat, lon, height = 0, azimuth = 0, elevation = 0, roll = 0 ) {

		const { group, ellipsoid } = this.tiles;

		// get ENU orientation (Z facing north and X facing west) and position
		ellipsoid.getObjectFrame( lat, lon, height, azimuth, elevation, roll, group.matrix, OBJECT_FRAME );

		// adjust the group matrix
		group.matrix.invert().decompose( group.position, group.quaternion, group.scale );
		group.updateMatrixWorld();

	}

	dispose() {

		const { group } = this.tiles;
		group.position.setScalar( 0 );
		group.quaternion.identity();
		group.scale.set( 1, 1, 1 );

		this.tiles.removeEventListener( 'load-root-tileset', this._callback );

	}

}
