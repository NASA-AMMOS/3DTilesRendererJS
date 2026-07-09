import { EventDispatcher, Matrix4, Vector2, Vector3 } from 'three';

// a non-marking handle for laying out items without claiming occupancy
const _dummyHandle = {
	test: () => false,
	mark: () => false,
};

export class OccupancyAnnotation {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;
		this.lodLevel = 0;

		// whether the annotation is enabled and ready to be displayed
		this.enabled = true;

		// whether the annotation is in a valid state. Used to decide whether annotations should
		// be hidden quickly
		this.valid = true;

		// whether the annotation is settled and ready to be displayed
		this.ready = false;

		// screen pos used for sorting
		this.screenPos = new Vector3();

		this.visibleDuration = Infinity;
		this.visibleTime = Infinity;
		this.visible = false;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

	}

	evaluate( handle, force ) {

		return false;

	}

	// called by the delayed manager when the item first becomes displayed or hidden, letting
	// subclasses reset any per-appearance state. Driven by the delayed manager
	onShown() {

	}

	onHidden() {

	}

}

export class ScreenOccupationManager extends EventDispatcher {

	get hasPendingWork() {

		return this.working || this.needsUpdate;

	}

	constructor() {

		super();

		// camera and local-to-world matrix
		this.camera = null;
		this.matrix = new Matrix4();

		// time budget per frame for the sliced update pass
		this.maxUpdateTimeMs = 0.5;

		// forever-running update pass, sliced by the per-frame deadline
		this._task = null;
		this._deadline = 0;

		// whether an update pass is currently in flight, meaning the visible sets and occupancy cells
		// are partially updated
		this.working = false;

		// TODO: do we use DPR here? Or
		// occupancy cells
		this.resolution = new Vector2( 1, 1 );
		this.size = 12;
		this.cells = new Uint32Array( 1 );

		// grid dimensions in cells, computed once per update and reused by _cellRange
		this._totalResolution = new Vector2();
		this._lastMatrix = new Matrix4();

		// scratch camera vectors used for generator iteration
		this._ndcMatrix = new Matrix4();
		this._invMatrix = new Matrix4();
		this._cameraLocalPos = new Vector3();


		// buffer outside the screen
		this.buffer = 0.15;

		// items
		this.items = [];
		this.visible = new Set();
		this.prevVisible = new Set();
		this.added = new Set();

		// prevents duplicate items during simultaneous LoD tile swaps
		this._itemSet = new Set();
		this._itemsNeedsUpdate = false;
		this.needsUpdate = false;

		this._id = - 1;
		this.handle = {
			test: ( x, y, r ) => {

				const { cells, _id } = this;
				let hasCells = false;
				const blocked = this._cellRange( x, y, r, ( x, y, i ) => {

					hasCells = true;
					return cells[ i ] !== 0 && cells[ i ] !== _id;

				} );
				return blocked || ! hasCells;

			},
			mark: ( x, y, r ) => {

				const { cells, _id } = this;
				return this._cellRange( x, y, r, ( x, y, i ) => {

					cells[ i ] = _id;
					return false;

				} );

			},
		};
		this.sortCallback = () => 0;

	}

	_cellRange( x, y, r, callback ) {

		const { size, resolution, buffer } = this;

		// calculate expanded dimensions
		const resWidth = resolution.width;
		const resHeight = resolution.height;
		const bufferX = resWidth * buffer;
		const bufferY = resHeight * buffer;

		// grid dimensions are precomputed once per update() in this._totalResolution
		const { width, height } = this._totalResolution;
		const centerX = x + bufferX;
		const centerY = y + bufferY;
		const x0 = Math.max( 0, Math.floor( ( centerX - r ) / size ) );
		const y0 = Math.max( 0, Math.floor( ( centerY - r ) / size ) );
		const x1 = Math.min( width - 1, Math.floor( ( centerX + r ) / size ) );
		const y1 = Math.min( height - 1, Math.floor( ( centerY + r ) / size ) );
		const r2 = r * r;

		for ( let cy = y0; cy <= y1; cy ++ ) {

			for ( let cx = x0; cx <= x1; cx ++ ) {

				// skip cells with no overlap with the circle
				const nearX = Math.max( cx * size, Math.min( centerX, ( cx + 1 ) * size ) );
				const nearY = Math.max( cy * size, Math.min( centerY, ( cy + 1 ) * size ) );
				const dx = centerX - nearX;
				const dy = centerY - nearY;
				if (
					dx * dx + dy * dy <= r2 &&
					callback( cx, cy, cy * width + cx ) === true
				) {

					return true;

				}

			}

		}

		return false;

	}

	syncItems() {

		// reconstruct the items list
		const { items, _itemSet } = this;
		if ( this._itemsNeedsUpdate ) {

			this._itemsNeedsUpdate = false;
			items.length = _itemSet.size;

			let i = 0;
			for ( const item of _itemSet.values() ) {

				items[ i ] = item;
				i ++;

			}

		}

	}

	// deadline
	_deadlineExpired() {

		return performance.now() >= this._deadline;

	}

	_resetDeadline() {

		this._deadline = performance.now() + this.maxUpdateTimeMs;

	}

	update() {

		// tick the forever-running update task, giving it a fresh time budget
		if ( this._task === null ) {

			this._task = this._updateGenerator();

		}

		this._task.next();

	}

	// run the in-flight pass (or a fresh one if changes are pending) to completion so the visible
	// sets and "change" event reflect the current state immediately
	flush() {

		if ( this._task === null ) {

			this._task = this._updateGenerator();

		}

		do {

			this._task.next();

		} while ( this.working );

	}

	updateCameraTransform() {

		const { camera, matrix, _ndcMatrix, _invMatrix, _cameraLocalPos } = this;

		// compute the NDC matrix and camera local position, captured once per pass so a pass
		// that spans multiple frames stays self-consistent
		_ndcMatrix
			.copy( matrix )
			.premultiply( camera.matrixWorldInverse )
			.premultiply( camera.projectionMatrix );

		_invMatrix.copy( matrix ).invert();
		_cameraLocalPos.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _invMatrix );


	}

	*_updateGenerator() {

		// runs forever: each pass transforms, sorts, and evaluates the full item list, yielding
		// whenever the per-frame budget is spent and resuming on the next update
		this._resetDeadline();

		while ( true ) {

			const {
				resolution,
				size,
				added,
				handle,
				sortCallback,
				buffer,
				items,
				_lastMatrix,
				_itemSet,
				_ndcMatrix,
				_cameraLocalPos,
			} = this;

			// update the camera transform for the occupancy iteration
			this.updateCameraTransform();

			// wait until the camera has changed or an update has been requested
			if ( _lastMatrix.equals( _ndcMatrix ) && ! this.needsUpdate ) {

				yield;
				this._resetDeadline();
				continue;

			}

			_lastMatrix.copy( _ndcMatrix );
			this.needsUpdate = false;
			this.working = true;

			this.syncItems();

			// swap visible and prevVisible — prevVisible now holds the last pass' result
			[ this.visible, this.prevVisible ] = [ this.prevVisible, this.visible ];

			const { visible, prevVisible } = this;
			visible.clear();
			added.clear();

			// resize the occupation cells to cover the extended viewport
			this._totalResolution.copy( resolution )
				.multiplyScalar( 1 + 2 * buffer )
				.multiplyScalar( 1 / size )
				.ceil();

			const { width, height } = this._totalResolution;
			if ( this.cells.length !== width * height ) {

				this.cells = new Uint8Array( width * height );

			} else {

				this.cells.fill( 0 );

			}

			// transform items to screen space
			for ( let i = 0, l = items.length; i < l; i ++ ) {

				const item = items[ i ];
				if ( item.enabled ) {

					item.updateTransform( _ndcMatrix, resolution, _cameraLocalPos );

				}

				if ( this._deadlineExpired() ) {

					yield;
					this._resetDeadline();
					this.updateCameraTransform();

				}

			}

			// sort the items ( atomic - a single sort can't be sliced )
			items.sort( sortCallback );

			if ( this._deadlineExpired() ) {

				yield;
				this._resetDeadline();
				this.updateCameraTransform();

			}

			// evaluate occupancy into the fresh visible set
			for ( let i = 0, l = items.length; i < l; i ++ ) {

				const item = items[ i ];
				this._id = i + 1;

				// disabled items ( filtered out by the driver ) are skipped so they fall out of the
				// visible set and fade out via the delayed manager, without being unregistered.
				// Items unregistered while the pass was in flight are skipped so they aren't
				// dispatched as visible.
				if ( item.enabled && _itemSet.has( item ) && item.evaluate( handle ) ) {

					visible.add( item );
					if ( ! prevVisible.has( item ) ) {

						item.visible = true;
						added.add( item );

					} else {

						item.visible = false;
						prevVisible.delete( item );

					}

				}

				if ( this._deadlineExpired() ) {

					yield;
					this._resetDeadline();
					this.updateCameraTransform();

				}

			}

			this.working = false;

			if ( added.size > 0 || prevVisible.size > 0 ) {

				this.dispatchEvent( { type: 'change', added, removed: prevVisible } );

			}

			// always yield at the end of a pass so an unchanged view can't busy-spin
			yield;
			this._resetDeadline();

		}

	}

	// re-layout a single item at the current view without claiming occupancy, so an item that has
	// lost placement (eg a label fading out) keeps its layout current instead of freezing.
	// Forces placement past the usual fit checks - must be called right after update() so the scratch
	// is fresh.
	refreshLayout( item ) {

		const { resolution, _ndcMatrix, _cameraLocalPos } = this;
		item.updateTransform( _ndcMatrix, resolution, _cameraLocalPos );
		item.evaluate( _dummyHandle, true );

	}

	register( item ) {

		this._itemSet.add( item );
		this._itemsNeedsUpdate = true;
		this.needsUpdate = true;

	}

	unregister( item ) {

		this._itemSet.delete( item );
		this._itemsNeedsUpdate = true;
		this.needsUpdate = true;

	}

}
