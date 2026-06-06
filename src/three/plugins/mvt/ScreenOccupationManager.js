import { EventDispatcher, Matrix4, Vector2, Vector3 } from 'three';

const _ndcMatrix = /* @__PURE__ */ new Matrix4();
const _invMatrix = /* @__PURE__ */ new Matrix4();
const _cameraLocalPos = /* @__PURE__ */ new Vector3();

// suppress annotations within ~6 degrees of the globe horizon
const PERSPECTIVE_CULL_THRESHOLD = 0.1;

export class AnnotationItem {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;
		this.ready = false;
		this.lodLevel = 0;
		this.firstShownTime = Infinity;
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
		this.radius = 16;

		// raw NDC z; used as a sort tiebreaker
		this.depth = 0;

		// x/y in screen pixels; z is 0 (in-frustum) or 1 (clipped)
		this._screenPos = new Vector3();

		// dot( surfaceNormal, toCam ); 0 at horizon, 1 facing camera
		this._facingRatio = 1;

	}

	updateTransform( matrix, resolution, cameraPosition ) {

		const screenPos = this._screenPos;

		screenPos.copy( this.position ).applyMatrix4( matrix );

		const z = screenPos.z;
		screenPos.x = ( screenPos.x * 0.5 + 0.5 ) * resolution.width;
		screenPos.y = ( - screenPos.y * 0.5 + 0.5 ) * resolution.height;
		screenPos.z = ( z < - 1 || z > 1 ) ? 1 : 0;
		this.depth = z;

		// facing ratio: dot( surface normal, direction to camera )
		// TODO: store geodetic normal on the item at creation time and use it here instead of
		// normalize( position ), which is only a spherical approximation (<0.2° error on WGS84)
		if ( cameraPosition !== null ) {

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

	copyPosition( source ) {

		this.position.copy( source.position );
		this.ready = true;

	}

	evaluate( handle ) {

		const { _screenPos, radius, _facingRatio } = this;
		if ( ! this.ready ) {

			return false;

		}

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

		// camera and local-to-world matrix (tilesGroup.matrixWorld); NDC matrix is computed internally
		this.camera = null;
		this.matrix = new Matrix4();

		// occupancy cells
		this.resolution = new Vector2( 1, 1 );
		this.size = 25 / window.devicePixelRatio;
		this.cells = new Uint8Array( 1 );

		// fraction of the shorter viewport dimension to extend evaluation beyond screen edges
		this.buffer = 0.15;

		// items
		this.items = [];
		this.visible = new Set();
		this.prevVisible = new Set();
		this.added = new Set();

		// prevents duplicate items during simultaneous LoD tile swaps
		this._itemsById = new Map();

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
		const bufferX = resolution.width * buffer;
		const bufferY = resolution.height * buffer;
		const width = Math.ceil( ( resolution.width + 2 * bufferX ) / size );
		const height = Math.ceil( ( resolution.height + 2 * bufferY ) / size );
		const ox = x + bufferX;
		const oy = y + bufferY;
		const x0 = Math.max( 0, Math.floor( ( ox - r ) / size ) );
		const y0 = Math.max( 0, Math.floor( ( oy - r ) / size ) );
		const x1 = Math.min( width - 1, Math.floor( ( ox + r ) / size ) );
		const y1 = Math.min( height - 1, Math.floor( ( oy + r ) / size ) );

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

		const { camera, matrix, resolution, size, items, added, handle, sortCallback } = this;

		// compute NDC matrix and camera local position from camera + localToWorld matrix
		let ndcMatrix = null;
		let cameraLocalPos = null;
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

		// swap visible and prevVisible — prevVisible now holds last frame's result
		[ this.visible, this.prevVisible ] = [ this.prevVisible, this.visible ];

		const { visible, prevVisible } = this;
		visible.clear();
		added.clear();

		// resize the occupation cells to cover the extended viewport
		const bufferX = resolution.width * this.buffer;
		const bufferY = resolution.height * this.buffer;
		const width = Math.ceil( ( resolution.width + 2 * bufferX ) / size );
		const height = Math.ceil( ( resolution.height + 2 * bufferY ) / size );
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
		const currTime = performance.now();
		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];
			if ( ndcMatrix !== null && item.evaluate( handle ) ) {

				visible.add( item );
				if ( ! prevVisible.has( item ) ) {

					item.firstShownTime = currTime;
					added.add( item );

				} else {

					prevVisible.delete( item );

				}

			}

		}

		if ( added.size > 0 ) {

			this.dispatchEvent( { type: 'added', items: added } );

		}

		if ( prevVisible.size > 0 ) {

			this.dispatchEvent( { type: 'removed', items: prevVisible } );

		}

	}

	getById( id ) {

		return this._itemsById.get( id );

	}

	register( item ) {

		const { _itemsById, items } = this;

		const existing = _itemsById.get( item.id );
		if ( existing ) {

			existing._refCount ++;
			if ( item.lodLevel > existing.lodLevel ) {

				existing.lodLevel = item.lodLevel;
				existing.lat = item.lat;
				existing.lon = item.lon;

			}

			return existing;

		}

		item._refCount = 1;
		_itemsById.set( item.id, item );
		items.push( item );
		return item;

	}

	unregister( item ) {

		item._refCount --;
		if ( item._refCount > 0 ) return;

		const { items, prevVisible, _itemsById } = this;
		const index = items.indexOf( item );
		if ( index !== - 1 ) {

			items.splice( index, 1 );

		}

		if ( _itemsById.get( item.id ) === item ) {

			_itemsById.delete( item.id );

		}

		prevVisible.delete( item );

	}

}
