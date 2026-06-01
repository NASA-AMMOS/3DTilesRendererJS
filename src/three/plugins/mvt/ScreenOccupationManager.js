import { EventDispatcher, Vector2 } from 'three';

// ScreenOccupationManager handles screen-space collision de-confliction for annotations.
//
// LoD transition strategy:
// When the active MVT tile set changes (LoD change), annotations are reconciled by feature ID:
//
// 1. STABLE annotations (feature ID present in both old and new LoD):
//    - Remain registered and visible at their existing world position.
//    - Their elevation is updated asynchronously via the raycast queue once the new terrain
//      tile mesh is available. The occupancy grid is updated in-place when the new position settles.
//
// 2. DISAPPEARED annotations (feature ID present in old LoD, absent in new):
//    - Unregistered and faded out immediately when the old MVT tile is released.
//
// 3. NEW annotations (feature ID absent in old LoD, present in new):
//    - Queued for elevation raycasting. Not registered until raycasting is complete.
//    - Processed in descending priority order (rank / importance) so that high-priority
//      annotations claim grid cells first, preventing low-priority annotations from
//      blocking them and then being evicted.
//
// The occupancy grid is always in a valid state — stable annotations never leave the grid
// during a transition, so there are no frames where previously visible content disappears.

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
