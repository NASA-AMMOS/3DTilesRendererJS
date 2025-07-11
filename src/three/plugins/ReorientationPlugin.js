import { Sphere } from 'three';
import { OBJECT_FRAME } from '../../three/renderer/math/Ellipsoid.js';

const sphere = /* @__PURE__ */ new Sphere();
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

					// otherwise see if this is possibly a tile set on the surface of the globe based on the positioning
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

			tiles.removeEventListener( 'load-tile-set', this._callback );

		};

		tiles.addEventListener( 'load-tile-set', this._callback );

		if ( tiles.root ) {

			this._callback();

		}

	}

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

		this.tiles.removeEventListener( 'load-tile-set', this._callback );

	}

}
