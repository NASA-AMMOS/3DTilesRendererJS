import { Box3, DoubleSide, MathUtils, Matrix4, MeshBasicMaterial, Raycaster, Sphere, Vector3 } from 'three';

// Limitations:
// - No support for BatchedTilesPlugin when resetting or modifying geometry
// - Sharing geometry between models may result in incorrect flattening

const _sphere = /* @__PURE__ */ new Sphere();
const _vec = /* @__PURE__ */ new Vector3();
const _matrix = /* @__PURE__ */ new Matrix4();
const _invMatrix = /* @__PURE__ */ new Matrix4();
const _raycaster = /* @__PURE__ */ new Raycaster();
const _doubleSidedMaterial = /* @__PURE__ */ new MeshBasicMaterial( { side: DoubleSide } );
const _box = /* @__PURE__ */ new Box3();
const RAYCAST_DISTANCE = 1e5;

function calculateSphere( object, target ) {

	if ( object.isBufferGeometry ) {

		if ( object.boundingSphere === null ) {

			object.computeBoundingSphere();

		}

		return target.copy( object.boundingSphere );

	} else {

		_box.setFromObject( object );
		_box.getBoundingSphere( target );
		return target;

	}

}

export class TileFlatteningPlugin {

	constructor() {

		this.name = 'TILE_FLATTENING_PLUGIN';
		this.priority = - 100;

		this.tiles = null;
		this.shapes = new Map();
		this.positionsMap = new Map();
		this.positionsUpdated = new Set();
		this.needsUpdate = false;

	}

	init( tiles ) {

		this.tiles = tiles;
		this.needsUpdate = true;

		this._updateBeforeCallback = () => {

			if ( this.needsUpdate ) {

				this._updateTiles();
				this.needsUpdate = false;

			}

		};

		this._disposeModelCallback = ( { tile } ) => {

			this.positionsMap.delete( tile );
			this.positionsUpdated.delete( tile );

		};

		tiles.addEventListener( 'update-before', this._updateBeforeCallback );
		tiles.addEventListener( 'dispose-model', this._disposeModelCallback );

	}

	// update tile flattening state if it has not been made visible, yet
	setTileActive( tile, active ) {

		if ( active && ! this.positionsUpdated.has( tile ) ) {

			this._updateTile( tile );

		}

	}

	_updateTile( tile ) {

		const { positionsUpdated, positionsMap, shapes, tiles } = this;
		positionsUpdated.add( tile );

		const scene = tile.cached.scene;
		if ( ! positionsMap.has( tile ) ) {

			// save the geometry positions for resetting after
			const geomMap = new Map();
			positionsMap.set( tile, geomMap );
			scene.traverse( c => {

				if ( c.geometry ) {

					geomMap.set( c.geometry, c.geometry.attributes.position.array.slice() );

				}

			} );

		} else {

			// reset the geometry state before re-flattening tiles
			const geomMap = positionsMap.get( tile );
			scene.traverse( c => {

				if ( c.geometry ) {

					const buffer = geomMap.get( c.geometry );
					if ( buffer ) {

						c.geometry.attributes.position.array.set( buffer );
						c.geometry.attributes.position.needsUpdate = true;

					}

				}

			} );

		}

		// TODO: if we save the sphere of the original mesh we can check the height to limit the tiles checked
		// TODO: we should use the tile bounding volume sphere if present
		scene.updateMatrixWorld( true );

		// iterate over every geometry
		scene.traverse( c => {

			const { geometry } = c;

			if ( ! geometry ) {

				return;

			}

			// calculate matrices
			_matrix.copy( c.matrixWorld );
			if ( scene.parent !== null ) {

				_matrix.premultiply( tiles.group.matrixWorldInverse );

			}

			_invMatrix.copy( _matrix ).invert();

			// calculate sphere for mesh
			calculateSphere( geometry, _sphere ).applyMatrix4( _matrix );

			// iterate over each shape
			shapes.forEach( ( {
				shape,
				direction,
				sphere,

				thresholdMode,
				threshold,
				flattenRange,
			} ) => {

				// check if the spheres overlap so there may actually be potential of geometry overlap
				_vec.subVectors( _sphere.center, sphere.center );
				_vec.addScaledVector( direction, - direction.dot( _vec ) );

				const r2 = ( _sphere.radius + sphere.radius ) ** 2;
				if ( _vec.lengthSq() > r2 ) {

					return;

				}

				// iterate over every vertex position
				const { position } = geometry.attributes;
				const { ray } = _raycaster;
				ray.direction.copy( direction ).multiplyScalar( - 1 );
				for ( let i = 0, l = position.count; i < l; i ++ ) {

					ray.origin
						.fromBufferAttribute( position, i )
						.applyMatrix4( _matrix )
						.addScaledVector( direction, RAYCAST_DISTANCE );
					_raycaster.far = RAYCAST_DISTANCE;

					const hit = _raycaster.intersectObject( shape )[ 0 ];
					if ( hit ) {

						let rangeAlpha = ( RAYCAST_DISTANCE - hit.distance ) / threshold;
						const aboveThreshold = rangeAlpha >= 1;
						if ( ! aboveThreshold || aboveThreshold && thresholdMode === 'flatten' ) {

							rangeAlpha = Math.min( rangeAlpha, 1.0 );

							hit.point.addScaledVector( ray.direction, MathUtils.mapLinear( rangeAlpha, 0, 1, - flattenRange, 0 ) );
							hit.point.applyMatrix4( _invMatrix );
							position.setXYZ( i, ...hit.point );

						}

					}

				}

			} );

		} );


		this.tiles.dispatchEvent( { type: 'needs-render' } );

	}

	_updateTiles() {

		this.positionsUpdated.clear();
		this.tiles.activeTiles.forEach( tile => this._updateTile( tile ) );

	}

	// API for updating and shapes to flatten the vertices
	hasShape( mesh ) {

		return this.shapes.has( mesh );

	}

	addShape( mesh, direction = new Vector3( 0, 0, - 1 ), options = {} ) {

		if ( this.hasShape( mesh ) ) {

			throw new Error( 'TileFlatteningPlugin: Shape is already used.' );

		}

		if ( typeof options === 'number' ) {

			console.warn( 'TileFlatteningPlugin: "addShape" function signature has changed. Please use an options object, instead.' );
			options = {
				threshold: options,
			};

		}

		this.needsUpdate = true;

		const shape = mesh.clone();
		shape.updateMatrixWorld( true );
		shape.traverse( c => {

			if ( c.material ) {

				c.material = _doubleSidedMaterial;

			}

		} );

		const sphere = calculateSphere( shape, new Sphere() );
		this.shapes.set( mesh, {
			shape: shape,
			direction: direction.clone(),
			sphere: sphere,

			// "flatten": Flattens the vertices above the shape
			// "none": leaves the vertices above the shape as they are
			thresholdMode: 'none',

			// only flatten within this range above the object
			threshold: Infinity,

			// the range to flatten vertices in to. 0 is completely flat
			// while 0.1 means a 10cm range.
			flattenRange: 0,

			...options,
		} );

	}

	updateShape( mesh ) {

		if ( ! this.hasShape( mesh ) ) {

			throw new Error( 'TileFlatteningPlugin: Shape is not present.' );

		}

		const { direction, threshold, thresholdMode, flattenRange } = this.shapes.get( mesh );
		this.deleteShape( mesh );
		this.addShape( mesh, direction, {
			threshold,
			thresholdMode,
			flattenRange,
		} );

	}

	deleteShape( mesh ) {

		this.needsUpdate = true;
		return this.shapes.delete( mesh );

	}

	clearShapes() {

		if ( this.shapes.size === 0 ) {

			return;

		}

		this.needsUpdate = true;
		this.shapes.clear();

	}

	// reset the vertex positions and remove the update callback
	dispose() {

		this.tiles.removeEventListener( 'before-update', this._updateBeforeCallback );
		this.tiles.removeEventListener( 'dispose-model', this._disposeModelCallback );

		this.positionsMap.forEach( geomMap => {

			geomMap.forEach( ( buffer, geometry ) => {

				const { position } = geometry.attributes;
				position.array.set( buffer );
				position.needsUpdate = true;

			} );

		} );

	}

}
