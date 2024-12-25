import { MeshBasicMaterial } from 'three';

// A hacky version of BatchedMesh that passes through functions and geometry and other fields from the underlying
// BatchedMesh. Calls to "this" or "super" will not work in subfunctions.
export class PassThroughBatchedMesh {

	constructor( other, material = new MeshBasicMaterial() ) {

		// the other batched mesh
		this.other = other;

		// guarded fields
		this.material = material;
		this.visible = true;
		this.parent = null;
		this._instanceInfo = [];
		this._visibilityChanged = true;

		// the proxy instance tht pass through arguments to the underlying mesh
		const proxyTarget = new Proxy( this, {

			get( target, key ) {

				if ( key in target ) {

					return target[ key ];

				} else {

					// sync instances on function call and call functions on "this" instance
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

			// ownKeys() {},
			// has(target, key) {},
			// defineProperty(target, key, descriptor) {},
			// getOwnPropertyDescriptor(target, key) {},

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
