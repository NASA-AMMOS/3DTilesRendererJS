/** @import { Material } from 'three' */
/** @import { PolygonAnnotation } from './annotations/PolygonAnnotation.js' */
import { BatchedMesh, BufferAttribute, BufferGeometry, Color, Group, Matrix4, MeshStandardMaterial, ShapeUtils, Vector3 } from 'three';
import { ColorManager } from './debug/ColorManager.js';

const ColorMode = {
	NONE: 0,
	ID: 1,
	LEVEL: 2,
	TILE: 3,
};

const _matrix = /* @__PURE__ */ new Matrix4();
const _pos = /* @__PURE__ */ new Vector3();
const _color = /* @__PURE__ */ new Color();

/**
 * @callback MVTGetHeightCallback
 * @param {string} layer - The MVT layer the feature belongs to.
 * @param {Object} properties - The feature's property map.
 * @returns {number} Height in meters.
 */

// Indexed extrusion of the footprint rings between the two heights, with flat shaded walls and a
// top cap. The rings hold 2d points in the annotation's local frame, and walls along the tile
// boundary are skipped so the pieces of a clipped building join without a seam.
function extrudeRings( rings, minHeight, height ) {

	let vertexCount = 0;
	for ( const { points, boundary } of rings ) {

		// walls use four vertices per edge, the cap one per point
		vertexCount += points.length;
		for ( let i = 0, l = points.length; i < l; i ++ ) {

			if ( ! boundary[ i ] ) {

				vertexCount += 4;

			}

		}

	}

	const contour = rings[ 0 ].points;
	const holes = [];
	for ( let i = 1, l = rings.length; i < l; i ++ ) {

		holes.push( rings[ i ].points );

	}

	const faces = ShapeUtils.triangulateShape( contour, holes );
	const position = new Float32Array( vertexCount * 3 );
	const normal = new Float32Array( vertexCount * 3 );
	const index = [];

	// wall normals point away from the solid, so the exterior winding sets their side
	const flip = ShapeUtils.isClockWise( contour );
	let v = 0;
	for ( const { points, boundary } of rings ) {

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			if ( boundary[ i ] ) {

				continue;

			}

			const p0 = points[ i ];
			const p1 = points[ ( i + 1 ) % l ];
			const dx = p1.x - p0.x;
			const dy = p1.y - p0.y;
			const len = Math.sqrt( dx * dx + dy * dy ) || 1;
			const nx = ( flip ? - dy : dy ) / len;
			const ny = ( flip ? dx : - dx ) / len;

			position.set( [
				p0.x, p0.y, minHeight,
				p1.x, p1.y, minHeight,
				p1.x, p1.y, height,
				p0.x, p0.y, height,
			], v * 3 );

			for ( let j = 0; j < 4; j ++ ) {

				normal.set( [ nx, ny, 0 ], ( v + j ) * 3 );

			}

			if ( flip ) {

				index.push( v, v + 2, v + 1, v, v + 3, v + 2 );

			} else {

				index.push( v, v + 1, v + 2, v, v + 2, v + 3 );

			}

			v += 4;

		}

	}

	// cap
	const capStart = v;
	for ( const { points } of rings ) {

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			position.set( [ points[ i ].x, points[ i ].y, height ], v * 3 );
			normal.set( [ 0, 0, 1 ], v * 3 );
			v ++;

		}

	}

	// the triangulation indexes the contour and holes consecutively, matching the cap layout
	for ( const [ a, b, c ] of faces ) {

		const ax = position[ ( capStart + a ) * 3 ];
		const ay = position[ ( capStart + a ) * 3 + 1 ];
		const bx = position[ ( capStart + b ) * 3 ];
		const by = position[ ( capStart + b ) * 3 + 1 ];
		const cx = position[ ( capStart + c ) * 3 ];
		const cy = position[ ( capStart + c ) * 3 + 1 ];

		// wind the cap triangles counter clockwise so they face up
		if ( ( bx - ax ) * ( cy - ay ) - ( by - ay ) * ( cx - ax ) < 0 ) {

			index.push( capStart + a, capStart + c, capStart + b );

		} else {

			index.push( capStart + a, capStart + b, capStart + c );

		}

	}

	const geometry = new BufferGeometry();
	geometry.setAttribute( 'position', new BufferAttribute( position, 3 ) );
	geometry.setAttribute( 'normal', new BufferAttribute( normal, 3 ) );
	geometry.setIndex( index );
	return geometry;

}

/**
 * Manages the extruded building meshes for polygon annotations, batched into one mesh per vector
 * tile under `group`.
 */
export class MVTBuildings {

	/**
	 * The color modes assignable to `colorMode`.
	 * @type {Object}
	 */
	get ColorMode() {

		return ColorMode;

	}

	/**
	 * Debug coloring of the buildings; one of `ColorMode`.
	 * @type {number}
	 * @default ColorMode.NONE
	 */
	get colorMode() {

		return this._colorMode;

	}

	set colorMode( value ) {

		if ( value !== this._colorMode ) {

			this._colorMode = value;
			this._tiles.forEach( ( { mesh, instanceIds } ) => {

				instanceIds.forEach( ( instanceId, item ) => this._applyColor( mesh, instanceId, item ) );

			} );

		}

	}

	/**
	 * @param {Object} [options]
	 * @param {MVTGetHeightCallback} [options.getHeight] - Height of the extrusion.
	 * @param {MVTGetHeightCallback} [options.getMinHeight] - Base of the extrusion.
	 * @param {Material} [options.material] - Material shared by every batch.
	 */
	constructor( options = {} ) {

		const {
			getHeight = () => 0,
			getMinHeight = () => 0,
			material = new MeshStandardMaterial(),
		} = options;

		/**
		 * Group holding the batched meshes.
		 * @type {Group}
		 */
		this.group = new Group();

		this.getHeight = getHeight;
		this.getMinHeight = getMinHeight;

		/**
		 * Material shared by every batch.
		 * @type {Material}
		 */
		this.material = material;

		this._colorMode = ColorMode.NONE;

		// Map<tileKey, { mesh, invMatrix, instanceIds: Map<annotation, instanceId> }>
		this._tiles = new Map();

	}

	/**
	 * Updates the meshes from the polygons whose visibility changed and applies any settled
	 * frames. Call once per frame.
	 * @param {Iterable<PolygonAnnotation>} added - Polygons that became visible.
	 * @param {Iterable<PolygonAnnotation>} removed - Polygons that became hidden.
	 * @returns {void}
	 */
	update( added, removed ) {

		const { _tiles } = this;

		_tiles.forEach( ( { mesh, invMatrix, instanceIds } ) => {

			instanceIds.forEach( ( instanceId, item ) => {

				if ( item.needsUpdate ) {

					item.needsUpdate = false;
					mesh.setMatrixAt( instanceId, _matrix.copy( item.frame ).premultiply( invMatrix ) );

				}

			} );

		} );

		for ( const item of removed ) {

			const entry = _tiles.get( item.tileKey );
			const instanceId = entry?.instanceIds.get( item );
			if ( instanceId === undefined ) {

				continue;

			}

			entry.mesh.deleteInstance( instanceId );
			entry.instanceIds.delete( item );
			if ( entry.instanceIds.size === 0 ) {

				this._deleteTile( item.tileKey );

			}

		}

		const addedByTile = new Map();
		for ( const item of added ) {

			if ( ! addedByTile.has( item.tileKey ) ) {

				addedByTile.set( item.tileKey, [] );

			}

			addedByTile.get( item.tileKey ).push( item );

		}

		addedByTile.forEach( ( items, tileKey ) => {

			// a batch is sized once, so an existing tile is rebuilt with the new items included
			const entry = _tiles.get( tileKey );
			if ( entry ) {

				items.push( ...entry.instanceIds.keys() );
				this._deleteTile( tileKey );

			}

			this._addTile( tileKey, items );

		} );

	}

	/**
	 * Disposes every batch and the material.
	 * @returns {void}
	 */
	dispose() {

		for ( const tileKey of [ ...this._tiles.keys() ] ) {

			this._deleteTile( tileKey );

		}

		this.material.dispose();

	}

	_applyColor( mesh, instanceId, item ) {

		switch ( this._colorMode ) {

			case ColorMode.ID:
				ColorManager.getColor( item.id, _color );
				break;

			case ColorMode.LEVEL:
				ColorManager.getColor( item.lodLevel, _color );
				break;

			case ColorMode.TILE:
				ColorManager.getColor( item.tileKey, _color );
				break;

			default:
				_color.set( 0xffffff );
				break;

		}

		mesh.setColorAt( instanceId, _color );

	}

	_addTile( tileKey, items ) {

		const { getHeight, getMinHeight, material } = this;

		const geometries = [];
		let vertexCount = 0;
		let indexCount = 0;
		for ( const item of items ) {

			const { layer, properties } = item;
			const geometry = extrudeRings( item.rings, getMinHeight( layer, properties ), getHeight( layer, properties ) );
			geometries.push( geometry );
			vertexCount += geometry.attributes.position.count;
			indexCount += geometry.index.count;

		}

		// center the batch on the tile so the instance offsets stay small
		const mesh = new BatchedMesh( items.length, vertexCount, indexCount, material );
		for ( const item of items ) {

			mesh.position.add( _pos.setFromMatrixPosition( item.frame ) );

		}

		mesh.position.divideScalar( items.length );
		mesh.updateMatrix();
		const invMatrix = new Matrix4().copy( mesh.matrix ).invert();

		const instanceIds = new Map();
		for ( let i = 0, l = items.length; i < l; i ++ ) {

			const item = items[ i ];
			const geometry = geometries[ i ];
			const geometryId = mesh.addGeometry( geometry, geometry.attributes.position.count, geometry.index.count );
			const instanceId = mesh.addInstance( geometryId );
			mesh.setMatrixAt( instanceId, _matrix.copy( item.frame ).premultiply( invMatrix ) );
			instanceIds.set( item, instanceId );
			item.needsUpdate = false;

			if ( this._colorMode !== ColorMode.NONE ) {

				this._applyColor( mesh, instanceId, item );

			}

		}

		// the tiles group does not propagate matrix updates to children added after the fact
		this.group.add( mesh );
		mesh.updateMatrixWorld();
		this._tiles.set( tileKey, { mesh, invMatrix, instanceIds } );

	}

	_deleteTile( tileKey ) {

		const { mesh } = this._tiles.get( tileKey );
		this.group.remove( mesh );
		mesh.dispose();
		this._tiles.delete( tileKey );

	}

}
