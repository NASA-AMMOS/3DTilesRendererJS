import { MeshBasicMaterial } from 'three';

// NOTE this will not automatically delete instances on geometry delete.
export class PassThroughBatchedMesh {

	constructor( other, material = new MeshBasicMaterial() ) {

		this.other = other;
		this.material = material;
		this.visible = true;
		this.parent = null;
		this._instanceInfo = [];
		this._visibilityChanged = true;

		const proxyTarget = new Proxy( this, {

			get( target, key ) {

				if ( key in target ) {

					return target[ key ];

				} else {

					const value = other[ key ];
					if ( value instanceof Function ) {

						return ( ...args ) => {

							target.syncInstances();
							return value.call( proxyTarget, ...args );

						};

					} else {

						return other[ key ];

					}

				}

			},

			set( target, key, value ) {

				if ( key in target ) {

					target[ key ] = value;

				} else {

					other[ key ] = value;

				}

				return true;

			},


			deleteProperty( target, key ) {

				if ( key in target ) {

					return delete target[ key ];

				} else {

					return delete other[ key ];

				}

			},

			// ownKeys() {

			// },

			// has(target, key) {

			// },

			// defineProperty(target, key, descriptor) {
			// },

			// getOwnPropertyDescriptor(target, key) {
			// },


		} );

		return proxyTarget;

	}

	syncInstances() {

		const instanceInfo = this._instanceInfo;
		const otherInstanceInfo = this.other._instanceInfo;
		while ( otherInstanceInfo.length > instanceInfo.length ) {

			const index = instanceInfo.length;
			instanceInfo.push( new Proxy( { visible: false }, {

				get( target, key ) {

					if ( key in target ) {

						return target[ key ];

					} else {

						return otherInstanceInfo[ index ][ key ];

					}

				},

				set( target, key, value ) {

					if ( key in target ) {

						target[ key ] = value;

					} else {

						otherInstanceInfo[ index ][ key ] = value;

					}

					return true;

				}

			} ) );

		}

	}

}
