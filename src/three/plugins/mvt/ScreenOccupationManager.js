import { EventDispatcher, Matrix4, Vector2, Vector3 } from 'three';

const _ndcMatrix = /* @__PURE__ */ new Matrix4();
const _invMatrix = /* @__PURE__ */ new Matrix4();
const _cameraLocalPos = /* @__PURE__ */ new Vector3();
const _delta = /* @__PURE__ */ new Vector3();
const _totalResolution = /* @__PURE__ */ new Vector2();

// suppress annotations within ~6 degrees of the globe horizon
const PERSPECTIVE_CULL_ANGLE = Math.acos( 0.1 );

export class AnnotationItem {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;
		this.ready = false;
		this.lodLevel = 0;
		this.visibleDuration = Infinity;
		this.visibleTime = Infinity;
		this.visible = false;
		this._refCount = 0;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

	}

	evaluate( handle ) {

		return false;

	}

	copyPosition( source ) {

	}

}

export class PointAnnotationItem extends AnnotationItem {

	constructor() {

		super();

		this.position = new Vector3();
		this.lat = 0;
		this.lon = 0;
		this.radius = 32;

		this._screenPos = new Vector3();
		this._facingAngle = 0;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		const { position } = this;
		const screenPos = this._screenPos;

		// project to screen space
		screenPos.copy( position ).applyMatrix4( matrix );

		// transform to resolution coordinates
		screenPos.x = ( screenPos.x * 0.5 + 0.5 ) * resolution.width;
		screenPos.y = ( - screenPos.y * 0.5 + 0.5 ) * resolution.height;
		screenPos.z = ( screenPos.z < - 1 || screenPos.z > 1 ) ? 1 : 0;

		// facing ratio: dot( surface normal, direction to camera )
		// TODO: store geodetic normal on the item at creation time and use it here instead of
		// normalize( position )
		if ( cameraPosition !== null ) {

			_delta.subVectors( cameraPosition, position );
			this._facingAngle = position.lengthSq() > 0 ? position.angleTo( _delta ) : 0;

		} else {

			this._facingAngle = 0;

		}

	}

	copyPosition( source ) {

		this.position.copy( source.position );
		this.ready = true;

	}

	evaluate( handle ) {

		const { _screenPos, radius, _facingAngle } = this;
		if ( ! this.ready ) {

			return false;

		}

		if ( _screenPos.z !== 0 ) {

			return false;

		}

		if ( _facingAngle > PERSPECTIVE_CULL_ANGLE ) {

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

		// camera and local-to-world matrix
		this.camera = null;
		this.matrix = new Matrix4();

		// TODO: do we use DPR here? Or
		// occupancy cells
		this.resolution = new Vector2( 1, 1 );
		this.size = 12;
		this.cells = new Uint8Array( 1 );

		// buffer outside the screen
		this.buffer = 0.15;

		// items
		this.items = [];
		this.visible = new Set();
		this.prevVisible = new Set();
		this.added = new Set();

		// prevents duplicate items during simultaneous LoD tile swaps
		this._itemsById = new Map();
		this._itemsNeedsUpdate = false;

		this.handle = {
			test: ( x, y, r ) => {

				const { cells } = this;
				let hasCells = false;
				const blocked = this._cellRange( x, y, r, ( x, y, i ) => {

					hasCells = true;
					return cells[ i ] !== 0;

				} );
				return blocked || ! hasCells;

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

		const { size, resolution, buffer } = this;

		// calculate expanded dimensions
		const resWidth = resolution.width;
		const resHeight = resolution.height;
		const bufferX = resWidth * buffer;
		const bufferY = resHeight * buffer;
		_totalResolution.copy( resolution )
			.multiplyScalar( 1 + 2 * buffer )
			.multiplyScalar( 1 / size )
			.ceil();

		// calculate ranges for iteration
		const { width, height } = _totalResolution;
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
		const { items, _itemsById } = this;
		if ( this._itemsNeedsUpdate ) {

			this._itemsNeedsUpdate = false;
			items.length = _itemsById.size;

			let i = 0;
			for ( const item of _itemsById.values() ) {

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
		_totalResolution.copy( resolution )
			.multiplyScalar( 1 + 2 * buffer )
			.multiplyScalar( 1 / size )
			.ceil();

		const { width, height } = _totalResolution;
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
			if ( ndcMatrix !== null && item.evaluate( handle ) ) {

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

	getById( id ) {

		return this._itemsById.get( id );

	}

	register( item ) {

		// register an item to be included in the occupation grid calculations
		const { _itemsById } = this;
		const existing = _itemsById.get( item.id );
		if ( existing ) {

			// use ref counting to avoid double-displaying redundant items
			existing._refCount ++;
			if ( item.lodLevel > existing.lodLevel ) {

				// use the highest LoD levels lat / lon assuming it's the most accurate
				existing.lodLevel = item.lodLevel;
				existing.lat = item.lat;
				existing.lon = item.lon;

			}

			return existing;

		} else {

			// otherwise add the new item
			item._refCount = 1;
			_itemsById.set( item.id, item );
			this._itemsNeedsUpdate = true;
			return item;

		}

	}

	unregister( item ) {

		// remove the item if our ref count has reached 0
		item._refCount --;
		if ( item._refCount > 0 ) {

			return;

		}

		if ( this._itemsById.get( item.id ) === item ) {

			this._itemsById.delete( item.id );
			this._itemsNeedsUpdate = true;

		}

	}

}
