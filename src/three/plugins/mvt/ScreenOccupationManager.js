import { EventDispatcher, Vector2, Vector3 } from 'three';

// suppress annotations within ~6 degrees of the globe horizon
const PERSPECTIVE_CULL_THRESHOLD = 0.1;

export class AnnotationItem {

	constructor() {

		this.id = '';
		this.layer = '';
		this.properties = null;

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
		this.lat = 0;
		this.lon = 0;
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
		this.prevVisible = new Set();
		this.added = new Set();

		// prevents duplicate items during simultaneous LoD tile swaps
		this._itemsById = new Map();

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

		const { matrix, cameraPosition, resolution, size, items, added, handle, sortCallback } = this;

		// swap visible and prevVisible — prevVisible now holds last frame's result
		[ this.visible, this.prevVisible ] = [ this.prevVisible, this.visible ];

		const { visible, prevVisible } = this;
		visible.clear();
		added.clear();

		// resize the occupation cells
		const width = Math.ceil( resolution.width / size );
		const height = Math.ceil( resolution.height / size );
		if ( this.cells.length !== width * height ) {

			this.cells = new Uint8Array( width * height );

		} else {

			this.cells.fill( 0 );

		}

		// transform items to screen space
		if ( matrix !== null ) {

			for ( let i = 0, l = items.length; i < l; i ++ ) {

				items[ i ].updateTransform( matrix, resolution, cameraPosition );

			}

		}

		// sort the items
		items.sort( sortCallback );

		// evaluate occupancy into the fresh visible set
		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];
			if ( matrix !== null && item.evaluate( handle ) ) {

				visible.add( item );
				if ( ! prevVisible.has( item ) ) {

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

		const { _itemsById, items, visible, prevVisible } = this;

		const existing = _itemsById.get( item.id );
		if ( existing ) {

			// simultaneous LoD swap: replace the old item in-place
			if ( visible.has( existing ) ) {

				visible.delete( existing );
				visible.add( item );

			}

			if ( prevVisible.has( existing ) ) {

				prevVisible.delete( existing );
				prevVisible.add( item );

			}

			const idx = items.indexOf( existing );
			if ( idx !== - 1 ) {

				items.splice( idx, 1 );

			}

		}

		_itemsById.set( item.id, item );
		items.push( item );

	}

	unregister( item ) {

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
