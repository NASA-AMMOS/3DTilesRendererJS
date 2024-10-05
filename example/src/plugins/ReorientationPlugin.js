import { Sphere } from 'three';

const sphere = new Sphere();
export class ReorientationPlugin {

	constructor( options ) {

		options = {
			up: 'z',

			lat: null,
			lon: null,
			height: 0,

		};

		this.tiles = null;

		this.up = options.up.toLowerCase().replace(/\s+/, '' );
		this.lat = options.lat;
		this.lon = options.lon;
		this.height = options.height;
		this._callback = null;

	}

	init( tiles ) {

		this.tiles = tiles;

		this._callback = () => {

			const { up, lat, lon, height } = this;

			if ( lat !== null && lon !== null ) {

				this.transformLatLonHeightToOrigin( lat, lon, height );

			} else {

				const { ellipsoid } = tiles;
				const minRadii = Math.min( ...ellipsoid.radius );
				tiles.getBoundingSphere( sphere );
				if ( sphere.center.length() > minRadii * 0.5 ) {

					const cart = ellipsoid.getPositionToCartographic( sphere.position );
					this.transformLatLonHeightToOrigin( cart.lat, cart.lon, cart.height );

				} else {

					const group = tiles.group;
					group.euler.setScalar( 0 );
					switch ( up ) {

						case 'x': case '+x':
							group.euler.z = Math.PI / 2;
							break;
						case '-x':
							group.euler.z = - Math.PI / 2;
							break;

						case 'y': case '+y':
							break;
						case '-y':
							group.euler.z = Math.PI;
							break;

						case 'z': case '+z':
							group.euler.x = - Math.PI / 2;
							break;
						case '-z':
							group.euler.x = Math.PI / 2;
							break;

					}

					tiles.group.position
						.copy( sphere.center )
						.applyEuler( group.euler )
						.multiplyScalar( - 1 );

				}

			}

			tiles.removeEventListener( 'load-tile-set', this._callback );

		};

		tiles.addEventListener( 'load-tile-set', this._callback );

	}

	transformLatLonHeightToOrigin( lat, lon, height = 0 ) {

	}

	dispose() {

		const { group } = this.tiles;
		group.position.setScalar( 0 );
		group.quaternion.identity();
		group.scale.set( 1, 1, 1 );

		this.tiles.addEventListener( 'load-tile-set', this._callback );

	}

}
