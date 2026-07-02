import { EventDispatcher, Matrix4, Vector2, Vector3 } from 'three';

const _ndcMatrix = /* @__PURE__ */ new Matrix4();
const _invMatrix = /* @__PURE__ */ new Matrix4();
const _cameraLocalPos = /* @__PURE__ */ new Vector3();

export class OccupancyAnnotation {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;
		this.ready = false;
		this.lodLevel = 0;
		this.visibleDuration = Infinity;
		this.visibleTime = Infinity;
		this.visible = false;
		this.enabled = true;
		this.screenPos = new Vector3();

	}

	updateTransform( matrix, resolution, cameraPosition ) {

	}

	evaluate( handle ) {

		return false;

	}

}

export class ScreenOccupationManager extends EventDispatcher {

	constructor() {

		super();

		// camera and local-to-world matrix
		this.camera = null;
		this.matrix = new Matrix4();

		// TODO: do we use DPR here? Or
		// occupancy cells
		this.resolution = new Vector2( 1, 1 );
		this.size = 12;
		this.cells = new Uint32Array( 1 );

		// grid dimensions in cells, computed once per update and reused by _cellRange
		this._totalResolution = new Vector2();

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

	update() {

		const {
			camera,
			matrix,
			resolution,
			size,
			added,
			handle,
			sortCallback,
			buffer,
			items,
		} = this;

		// compute NDC matrix and camera local position
		let ndcMatrix = null;
		let cameraLocalPos = null;

		// if there is no camera then items are considered non visible
		if ( camera !== null ) {

			_ndcMatrix
				.copy( matrix )
				.premultiply( camera.matrixWorldInverse )
				.premultiply( camera.projectionMatrix );
			ndcMatrix = _ndcMatrix;

			_invMatrix.copy( matrix ).invert();
			_cameraLocalPos.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _invMatrix );
			cameraLocalPos = _cameraLocalPos;

		}

		this.syncItems();

		// swap visible and prevVisible — prevVisible now holds last frame's result
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
		if ( ndcMatrix !== null ) {

			for ( let i = 0, l = items.length; i < l; i ++ ) {

				items[ i ].updateTransform( ndcMatrix, resolution, cameraLocalPos );

			}

		}

		// sort the items
		items.sort( sortCallback );

		// evaluate occupancy into the fresh visible set
		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];
			this._id = i + 1;

			// disabled items ( filtered out by the driver ) are skipped so they fall out of the
			// visible set and fade out via the delayed manager, without being unregistered
			if ( ndcMatrix !== null && item.enabled && item.evaluate( handle ) ) {

				visible.add( item );
				if ( ! prevVisible.has( item ) ) {

					item.visible = true;
					added.add( item );

				} else {

					item.visible = false;
					prevVisible.delete( item );

				}

			}

		}

		if ( added.size > 0 || prevVisible.size > 0 ) {

			this.dispatchEvent( { type: 'change', added, removed: prevVisible } );

		}

	}

	register( item ) {

		this._itemSet.add( item );
		this._itemsNeedsUpdate = true;

	}

	unregister( item ) {

		this._itemSet.delete( item );
		this._itemsNeedsUpdate = true;

	}

}
