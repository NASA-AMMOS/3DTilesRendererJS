import { DoubleSide, Matrix4, MeshBasicMaterial, Raycaster, Sphere, Vector3 } from 'three';
import { OBB } from '../../three/math/OBB.js';

// Limitations:
// - No support for BatchedTilesPlugin when resetting or modifying geometry
// - Sharing geometry between models may result in incorrect flattening

const _sphere = /* @__PURE__ */ new Sphere();
const _obb = /* @__PURE__ */ new OBB();
const _vec = /* @__PURE__ */ new Vector3();
const _matrix = /* @__PURE__ */ new Matrix4();
const _invMatrix = /* @__PURE__ */ new Matrix4();
const _raycaster = /* @__PURE__ */ new Raycaster();
const _doubleSidedMaterial = /* @__PURE__ */ new MeshBasicMaterial( { side: DoubleSide } );

function calculateSphere( object, target ) {

	if ( object instanceof OBB ) {

		_obb.copy( object );

	} else {

		// clone the object so we can calculate the root bounding box
		const clone = object.clone();
		clone.position.set( 0, 0, 0 );
		clone.quaternion.identity();
		clone.scale.setScalar( 1 );

		// construct obb
		_obb.box.setFromObject( clone, true );
		_obb.box.getSize( _vec );
		_obb.transform.copy( object.matrix );

	}

	// get sphere
	_obb.box.getBoundingSphere( target ).applyMatrix4( _obb.transform );

	return target;

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

		const ray = _raycaster.ray;
		shapes.forEach( ( {
			shape,
			direction,
			sphere,
		} ) => {

			// TODO: if we save the sphere of the original mesh we can check the height to limit the tiles checked
			// TODO: we should use the tile bounding volume sphere if present

			// calculate the project distance between circles
			const { boundingVolume } = tile.cached;
			calculateSphere( boundingVolume.obb || boundingVolume.regionObb, _sphere );
			_vec.subVectors( _sphere.center, sphere.center );
			_vec.addScaledVector( direction, - direction.dot( _vec ) );

			const r2 = ( _sphere.radius + sphere.radius ) ** 2;
			if ( _vec.lengthSq() > r2 ) {

				return;

			}

			// prepare the shape and ray
			ray.direction.copy( direction ).multiplyScalar( - 1 );

			scene.updateMatrixWorld( true );

			// iterate over every geometry
			scene.traverse( c => {

				if ( c.geometry ) {

					const { position } = c.geometry.attributes;
					position.needsUpdate = true;

					_matrix.copy( c.matrixWorld );
					if ( scene.parent !== null ) {

						_matrix.premultiply( tiles.group.matrixWorldInverse );

					}

					_invMatrix.copy( _matrix ).invert();

					// iterate over every vertex position
					for ( let i = 0, l = position.count; i < l; i ++ ) {

						ray.origin
							.fromBufferAttribute( position, i )
							.applyMatrix4( _matrix )
							.addScaledVector( direction, 1e5 );
						_raycaster.far = 1e5;

						const hit = _raycaster.intersectObject( shape )[ 0 ];
						if ( hit ) {

							hit.point.applyMatrix4( _invMatrix );
							position.setXYZ( i, ...hit.point );

						}

					}

				}

			} );

		} );

		this.tiles.dispatchEvent( { type: 'force-rerender' } );

	}

	_updateTiles() {

		this.positionsUpdated.clear();
		this.tiles.activeTiles.forEach( tile => this._updateTile( tile ) );

	}

	// API for updating and shapes to flatten the vertices
	hasShape( mesh ) {

		return this.shapes.has( mesh );

	}

	addShape( mesh, direction = new Vector3( 0, - 1, 0 ) ) {

		if ( this.hasShape( mesh ) ) {

			throw new Error( 'TileFlatteningPlugin: Shape is already used.' );

		}

		this.needsUpdate = true;

		mesh.updateMatrix();

		const sphere = calculateSphere( mesh, new Sphere() );
		const shape = mesh.clone();
		shape.matrixWorld.copy( shape.matrix );
		shape.traverse( c => {

			if ( c.material ) {

				c.material = _doubleSidedMaterial;

			}

		} );

		this.shapes.set( mesh, {
			shape: shape,
			direction: direction.clone(),
			sphere: sphere,
		} );

	}

	updateShape( mesh ) {

		if ( ! this.hasShape( mesh ) ) {

			throw new Error( 'TileFlatteningPlugin: Shape is not present.' );

		}

		this.needsUpdate = true;

		mesh.updateMatrix();

		const info = this.shapes.get( mesh );
		calculateSphere( mesh, info.sphere );
		info.shape = mesh.clone();
		info.shape.traverse( c => {

			if ( c.material ) {

				c.material = _doubleSidedMaterial;

			}

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

			geomMap.forEach( ( geometry, buffer ) => {

				const { position } = geometry.attributes;
				position.array.set( buffer );
				position.needsUpdate = true;

			} );

		} );

	}

}
