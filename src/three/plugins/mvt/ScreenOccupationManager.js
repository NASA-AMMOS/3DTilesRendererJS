import { EventDispatcher, Vector2, Vector3, WebGPUCoordinateSystem } from 'three';

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

export class AnnotationItem {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;

	}

	updateTransform( camera, resolution ) {

	}

	evaluate( handle ) {

		return false;

	}

}

export class PointAnnotationItem extends AnnotationItem {

	constructor() {

		super();

		this.position = new Vector3();
		this.radius = 10;

		// x/y = screen pixels, z = NDC depth (z > 1 means behind camera)
		this._screenPos = new Vector3();

	}

	updateTransform( camera, resolution ) {

		const screenPos = this._screenPos;
		const position = this.position;

		screenPos.copy( position ).project( camera );

		const zMin = camera.coordinateSystem === WebGPUCoordinateSystem ? 0 : - 1;
		const z = screenPos.z;
		screenPos.x = ( screenPos.x * 0.5 + 0.5 ) * resolution.width;
		screenPos.y = ( - screenPos.y * 0.5 + 0.5 ) * resolution.height;
		screenPos.z = ( z < zMin || z > 1 ) ? 1 : 0;

	}

	evaluate( handle ) {

		const { _screenPos, radius } = this;
		if ( _screenPos.z !== 0 ) {

			return false;

		}

		if ( handle.test( _screenPos.x, _screenPos.y, radius ) ) {

			return false;

		}

		handle.mark( _screenPos.x, _screenPos.y, radius );
		return true;

	}

}


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

		this.handle = {
			test: ( x, y, r ) => {

				const { cells } = this;
				return this._cellRange( x, y, r, ( x, y, i ) => {

					return cells[ i ] !== 0;

				} );

			},
			mark: ( x, y, r ) => {

				const { cells } = this;
				return this._cellRange( x, y, r, ( x, y, i ) => {

					cells[ i ] = 1;
					return false;

				} );

			},
		};
		this.sortCallback = () => 0;

	}

	_cellRange( x, y, r, callback ) {

		const { size, resolution } = this;
		const width = Math.ceil( resolution.width / size );
		const height = Math.ceil( resolution.height / size );
		const x0 = Math.max( 0, Math.floor( ( x - r ) / size ) );
		const y0 = Math.max( 0, Math.floor( ( y - r ) / size ) );
		const x1 = Math.min( width - 1, Math.floor( ( x + r ) / size ) );
		const y1 = Math.min( height - 1, Math.floor( ( y + r ) / size ) );

		for ( let cy = y0; cy <= y1; cy ++ ) {

			for ( let cx = x0; cx <= x1; cx ++ ) {

				if ( callback( cx, cy, cy * width + cx ) === true ) {

					return true;

				}

			}

		}

		return false;

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
			handle,
		} = this;

		// resize the occupation cells
		const width = Math.ceil( resolution.width / size );
		const height = Math.ceil( resolution.height / size );
		if ( this.cells.length !== width * height ) {

			this.cells = new Uint8Array( width * height );

		} else {

			this.cells.fill( 0 );

		}

		// transform the shape to the screen
		if ( camera !== null ) {

			for ( let i = 0, l = items.length; i < l; i ++ ) {

				items[ i ].updateTransform( camera, resolution );

			}

		}

		// sort the items
		items.sort( this.sortCallback );

		// prevVisible starts as last frame's visible set; items placed this frame are
		// deleted from it, leaving only items that disappeared (the removed set)
		added.clear();
		visible.clear();

		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];

			// check & mark occupancy
			if ( camera && item.evaluate( handle ) ) {

				visible.add( item );
				if ( ! prevVisible.has( item ) ) {

					added.add( item );

				} else {

					prevVisible.delete( item );

				}

			}

		}

		// events
		if ( added.size > 0 ) {

			this.dispatchEvent( { type: 'added', items: added } );

		}

		if ( this.prevVisible.size > 0 ) {

			// prev visible now only contains the "removed" items
			this.dispatchEvent( { type: 'removed', items: this.prevVisible } );

		}

		// swap the visibility for next update
		[ this.visible, this.prevVisible ] = [ this.prevVisible, this.visible ];

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
