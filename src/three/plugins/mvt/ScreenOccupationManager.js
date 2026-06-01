import { EventDispatcher, Vector2 } from 'three';

export class ScreenOccupationManager extends EventDispatcher {

	constructor() {

		super();

		// camera
		this.camera = null;

		// occupancy cells
		this.resolution = new Vector2( 1, 1 );
		this.size = 25;
		this.cells = new Uint8Array( 1 );

		// items
		this.items = [];
		this.visible = new Set();
		this.prevVisible = new Set();
		this.added = new Set();
		this.removed = new Set();

		this.sortCallback = () => 0;

	}

	update() {

		const {
			camera,
			resolution,
			size,
			items,
			visible,
			prevVisible,
			added,
			removed,
		} = this;

		// resize the occupation cells
		const width = Math.ceil( resolution.width / size );
		const height = Math.ceil( resolution.height / size );
		if ( this.cells.length !== width * height ) {

			this.cells = new Uint8Array( width * height );

		} else {

			this.cells.fill( 0 );

		}

		// sort the items
		items.sort( this.sortCallback );

		// save the visible set so we can know which had been removed
		removed.clear();
		added.clear();
		visible.clear();

		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];
			let canDisplay = true;

			if ( camera !== null ) {

				// TODO:
				// - transform the shape to the screen
				// - check occupancy

			}

			if ( canDisplay ) {

				// TODO: mark occupancy if possible

				visible.add( item );
				if ( ! prevVisible.has( item ) ) {

					added.add( item );

				}

			} else if ( prevVisible.has( item ) ) {

				removed.add( item );

			}

		}

		// swap the visibility
		[ this.visible, this.prevVisible ] = [ this.prevVisible, this.visible ];

		// events
		if ( added.size > 0 ) {

			this.dispatchEvent( { type: 'added', items: added } );

		}

		if ( removed.size > 0 ) {

			this.dispatchEvent( { type: 'removed', items: removed } );

		}

	}

	register( item ) {

		// TODO: how to register / handle non-linear layouts for text - custom callback?
		this.items.push( item );

	}

	unregister( item ) {

		const { items } = this;
		const index = items.indexOf( item );
		if ( index !== - 1 ) {

			items.splice( index, 1 );

		}

	}

}
