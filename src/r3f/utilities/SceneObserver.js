import { EventDispatcher } from 'three';

function traverse( root, callback ) {

	if ( callback( root ) ) {

		return;

	}

	root.children.forEach( c => {

		traverse( c, callback );

	} );

}

export class SceneObserver extends EventDispatcher {

	constructor() {

		super();

		this.objects = new Set();
		this.observed = new Set();
		this._addedCallback = ( { child } ) => {

			traverse( child, c => {

				if ( this.observed.has( c ) ) {

					return true;

				} else {

					this.objects.add( c );
					c.addEventListener( 'childadded', this._addedCallback );
					c.addEventListener( 'childremoved', this._removedCallback );
					this.dispatchEvent( { type: 'childadded', child } );
					return false;

				}

			} );

		};

		this._removedCallback = ( { child } ) => {

			traverse( child, c => {

				if ( this.observed.has( c ) ) {

					return true;

				} else {

					this.objects.delete( c );
					c.removeEventListener( 'childadded', this._addedCallback );
					c.removeEventListener( 'childremoved', this._removedCallback );
					this.dispatchEvent( { type: 'childremoved', child } );
					return false;

				}

			} );

		};

	}

	observe( root ) {

		const { observed } = this;
		this._addedCallback( { child: root } );
		observed.add( root );

	}

	unobserve( root ) {

		const { observed } = this;
		observed.delete( root );
		this._removedCallback( { child: root } );

	}

	dispose() {

		this.observed.forEach( root => {

			this.unobserve( root );

		} );

	}

}
