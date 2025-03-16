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

function calculateCirclePoint( object, direction, target ) {

	if ( object instanceof OBB ) {

		_obb.copy( object );

	} else {

		// construct obb
		object.matrix.identity();
		object.matrixWorld.identity();
		_obb.box.setFromObject( object, true );

		object.updateMatrix();
		_obb.transform.copy( object.matrix );

	}

	// get sphere
	_obb.box.getBoundingSphere( _sphere ).applyMatrix4( _obb.transform );

	// get projected point
	target.copy( _sphere.center ).addScaledVector( direction, - direction.dot( _sphere.center ) );
	return _sphere.radius;

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
		tiles.addEventListener( 'update-before', this._updateBeforeCallback );

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
			matrix,
			circleCenter,
			circleRadius,
		} ) => {

			// TODO: if we save the sphere of the original mesh we can check the height to limit the tiles checked
			// TODO: we should use the tile bounding volume sphere if present

			// calculate the bounding circle for the tile
			const { boundingVolume } = tile.cached;
			const tileCircleCenter = _vec;
			const tileCircleRadius = calculateCirclePoint( boundingVolume.obb || boundingVolume.regionObb, direction, tileCircleCenter );

			// check if we intersect
			const r2 = ( circleRadius + tileCircleRadius ) ** 2;
			if ( tileCircleCenter.distanceToSquared( circleCenter ) > r2 ) {

				return;

			}

			// prepare the shape and ray
			shape.matrix.copy( matrix );
			shape.matrixWorld.copy( shape.matrix );
			ray.direction.copy( direction );

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

						ray.origin.fromBufferAttribute( position, i ).applyMatrix4( _matrix );

						const hit = _raycaster.intersectObject( shape )[ 0 ];
						if ( hit ) {

							hit.point.applyMatrix4( _invMatrix );
							position.setXYZ( i, ...hit.point );

						}

					}

				}

			} );

		} );

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

		const circleCenter = new Vector3();
		const circleRadius = calculateCirclePoint( mesh, direction, circleCenter );
		const shape = mesh.clone();
		shape.traverse( c => {

			if ( c.material ) {

				c.material = _doubleSidedMaterial;

			}

		} );

		this.shapes.set( mesh, {
			shape: mesh,
			direction: direction.clone(),
			matrix: mesh.matrix.clone(),
			circleCenter: circleCenter,
			circleRadius: circleRadius,
		} );

	}

	updateShape( mesh ) {

		if ( ! this.hasShape( mesh ) ) {

			throw new Error( 'TileFlatteningPlugin: Shape is not present.' );

		}

		this.needsUpdate = true;

		mesh.updateMatrix();

		const info = this.shapes.get( mesh );
		info.matrix.copy( mesh.matrix );
		info.circleRadius = calculateCirclePoint( mesh, info.direction, info.circleCenter );
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
		this.positionsMap.forEach( geomMap => {

			geomMap.forEach( ( geometry, buffer ) => {

				const { position } = geometry.attributes;
				position.array.set( buffer );
				position.needsUpdate = true;

			} );

		} );

	}

}
