import { EventDispatcher, Vector2, Vector3 } from 'three';

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

// TODO: we need to handle delayed removal further. It's possible that these delays belong in the parent system, instead

// suppress annotations within ~6 degrees of the globe horizon
const PERSPECTIVE_CULL_THRESHOLD = 0.1;

export class AnnotationItem {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;
		this._visibleDuration = 0;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

	}

	evaluate( handle ) {

		return false;

	}

}

export class PointAnnotationItem extends AnnotationItem {

	constructor() {

		super();

		this.position = new Vector3();
		this.radius = 5;

		// x/y = screen pixels, z = NDC depth (z > 1 means behind camera)
		this._screenPos = new Vector3();
		this._depth = 0;
		this._facingRatio = 1;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		const screenPos = this._screenPos;

		screenPos.copy( this.position ).applyMatrix4( matrix );

		const z = screenPos.z;
		screenPos.x = ( screenPos.x * 0.5 + 0.5 ) * resolution.width;
		screenPos.y = ( - screenPos.y * 0.5 + 0.5 ) * resolution.height;
		screenPos.z = ( z < - 1 || z > 1 ) ? 1 : 0;
		this._depth = z;

		// facing ratio: dot( surface normal, direction to camera )
		// surface normal ≈ normalize( position ) for WGS84
		if ( cameraPosition !== null ) {

			// TODO: fix this
			const px = this.position.x, py = this.position.y, pz = this.position.z;
			const pLen = Math.sqrt( px * px + py * py + pz * pz );
			const dx = cameraPosition.x - px, dy = cameraPosition.y - py, dz = cameraPosition.z - pz;
			const dLen = Math.sqrt( dx * dx + dy * dy + dz * dz );
			this._facingRatio = ( pLen > 0 && dLen > 0 )
				? ( px * dx + py * dy + pz * dz ) / ( pLen * dLen )
				: 1;

		} else {

			this._facingRatio = 1;

		}

	}

	evaluate( handle ) {

		const { _screenPos, radius, _facingRatio } = this;
		if ( _screenPos.z !== 0 ) {

			return false;

		}

		if ( _facingRatio < PERSPECTIVE_CULL_THRESHOLD ) {

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

		// projection matrix: projectionMatrix * matrixWorldInverse * tilesGroup.matrixWorld
		this.matrix = null;

		// camera position in tiles.group local space, for perspective culling
		this.cameraPosition = null;

		// occupancy cells
		this.resolution = new Vector2( 1, 1 );
		this.size = 25 / window.devicePixelRatio;
		this.cells = new Uint8Array( 1 );

		// items
		this.items = [];
		this.visible = new Set();
		this.added = new Set();
		this.removed = new Set();

		// seconds an item must be continuously occupied/absent before show/hide fires
		this.delay = 0.25;
		this._lastUpdateTime = - 1;

		// keyed registries for LoD-coherent replacement
		this._itemsById = new Map();
		this._savedDurations = new Map();

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
			matrix,
			cameraPosition,
			resolution,
			size,
			items,
			visible,
			added,
			removed,
			handle,
			delay,
		} = this;

		// compute delta time, capped to avoid large jumps after tab suspension
		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		// resize the occupation cells
		const width = Math.ceil( resolution.width / size );
		const height = Math.ceil( resolution.height / size );
		if ( this.cells.length !== width * height ) {

			this.cells = new Uint8Array( width * height );

		} else {

			this.cells.fill( 0 );

		}

		// transform the shape to the screen
		if ( matrix !== null ) {

			for ( let i = 0, l = items.length; i < l; i ++ ) {

				items[ i ].updateTransform( matrix, resolution, cameraPosition );

			}

		}

		// sort the items
		items.sort( this.sortCallback );

		added.clear();
		removed.clear();

		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];
			const occupied = matrix !== null && item.evaluate( handle );

			// increment duration while occupied, decrement while absent (floored at 0)
			if ( occupied ) {

				item._visibleDuration = Math.min( item._visibleDuration + dt, delay );

			} else {

				item._visibleDuration = Math.max( item._visibleDuration - dt, 0 );

			}

			const wasVisible = visible.has( item );
			const visibleDuration = item._visibleDuration;

			// delay === 0: show only when currently occupied (avoids threshold=0 ambiguity)
			if ( ! wasVisible && visibleDuration === delay ) {

				visible.add( item );
				added.add( item );

			} else if ( wasVisible && ! occupied && visibleDuration === 0 ) {

				visible.delete( item );
				removed.add( item );

			}

		}

		if ( added.size > 0 ) {

			this.dispatchEvent( { type: 'added', items: added } );

		}

		if ( removed.size > 0 ) {

			this.dispatchEvent( { type: 'removed', items: removed } );

		}

	}

	register( item ) {

		// TODO: how to register / handle non-linear layouts for text - custom callback?
		const { _itemsById, _savedDurations, items, visible } = this;

		const existing = _itemsById.get( item.id );
		if ( existing ) {

			// simultaneous replacement: silently swap — no events, same duration, same visible slot
			item._visibleDuration = existing._visibleDuration;
			if ( visible.has( existing ) ) {

				visible.delete( existing );
				visible.add( item );

			}

			const idx = items.indexOf( existing );
			if ( idx !== - 1 ) items.splice( idx, 1 );

		} else if ( _savedDurations.has( item.id ) ) {

			// sequential replacement: restore state from the item that was unregistered first
			const saved = _savedDurations.get( item.id );
			item._visibleDuration = saved.duration;
			if ( saved.wasVisible ) {

				visible.add( item );

			}

			_savedDurations.delete( item.id );

		}

		_itemsById.set( item.id, item );
		items.push( item );

	}

	unregister( item ) {

		const { items, visible, _itemsById, _savedDurations } = this;
		const index = items.indexOf( item );
		if ( index !== - 1 ) {

			items.splice( index, 1 );

		}

		if ( _itemsById.get( item.id ) === item ) {

			_savedDurations.set( item.id, { duration: item._visibleDuration, wasVisible: visible.has( item ) } );
			_itemsById.delete( item.id );

		}

		visible.delete( item );
		item._visibleDuration = 0;

	}

}
