/** @import { Material } from 'three' */
/** @import { PolygonAnnotation } from './annotations/PolygonAnnotation.js' */
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, ShapeUtils } from 'three';
import { ColorManager } from './debug/ColorManager.js';

const ColorMode = {
	NONE: 0,
	ID: 1,
	LEVEL: 2,
	TILE: 3,
};

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
 * Manages the extruded building meshes for polygon annotations, one mesh per polygon under
 * `group`. Each mesh carries its annotation in `userData.annotation` so raycast hits can be
 * traced back to the feature.
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
			this._meshes.forEach( ( mesh, item ) => this._applyColor( mesh, item ) );

		}

	}

	/**
	 * @param {Object} [options]
	 * @param {MVTGetHeightCallback} [options.getHeight] - Height of the extrusion.
	 * @param {MVTGetHeightCallback} [options.getMinHeight] - Base of the extrusion.
	 * @param {Material} [options.material] - Material shared by every building.
	 */
	constructor( options = {} ) {

		const {
			getHeight = () => 0,
			getMinHeight = () => 0,
			material = new MeshStandardMaterial(),
		} = options;

		/**
		 * Group holding the building meshes.
		 * @type {Group}
		 */
		this.group = new Group();

		this.getHeight = getHeight;
		this.getMinHeight = getMinHeight;

		/**
		 * Material shared by every building.
		 * @type {Material}
		 */
		this.material = material;

		this._colorMode = ColorMode.NONE;

		// Map<annotation, Mesh>
		this._meshes = new Map();

		// Map<hex, Material> tinted copies of the material used by the debug color modes
		this._coloredMaterials = new Map();

	}

	/**
	 * Updates the meshes from the polygons whose visibility changed and applies any settled
	 * frames. Call once per frame.
	 * @param {Iterable<PolygonAnnotation>} added - Polygons that became visible.
	 * @param {Iterable<PolygonAnnotation>} removed - Polygons that became hidden.
	 * @returns {void}
	 */
	update( added, removed ) {

		const { _meshes, group, getHeight, getMinHeight, material } = this;

		_meshes.forEach( ( mesh, item ) => {

			if ( item.needsUpdate ) {

				item.needsUpdate = false;
				mesh.matrix.copy( item.frame );
				mesh.updateMatrixWorld( true );

			}

		} );

		for ( const item of removed ) {

			const mesh = _meshes.get( item );
			if ( mesh ) {

				group.remove( mesh );
				mesh.geometry.dispose();
				_meshes.delete( item );

			}

		}

		for ( const item of added ) {

			const { layer, properties } = item;
			const geometry = extrudeRings( item.rings, getMinHeight( layer, properties ), getHeight( layer, properties ) );
			const mesh = new Mesh( geometry, material );
			mesh.matrixAutoUpdate = false;
			mesh.matrix.copy( item.frame );
			mesh.userData.annotation = item;
			item.needsUpdate = false;

			if ( this._colorMode !== ColorMode.NONE ) {

				this._applyColor( mesh, item );

			}

			// the tiles group does not propagate matrix updates to children added after the fact
			group.add( mesh );
			mesh.updateMatrixWorld( true );
			_meshes.set( item, mesh );

		}

	}

	/**
	 * Disposes every mesh and the materials.
	 * @returns {void}
	 */
	dispose() {

		this._meshes.forEach( mesh => {

			this.group.remove( mesh );
			mesh.geometry.dispose();

		} );
		this._meshes.clear();

		this._coloredMaterials.forEach( material => material.dispose() );
		this._coloredMaterials.clear();
		this.material.dispose();

	}

	_applyColor( mesh, item ) {

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
				mesh.material = this.material;
				return;

		}

		const { _coloredMaterials } = this;
		const hex = _color.getHex();
		if ( ! _coloredMaterials.has( hex ) ) {

			const material = this.material.clone();
			material.color.setHex( hex );
			_coloredMaterials.set( hex, material );

		}

		mesh.material = _coloredMaterials.get( hex );

	}

}
