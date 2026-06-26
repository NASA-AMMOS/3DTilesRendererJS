import { BufferAttribute, DataTexture, LineSegments, Points, Vector3, Color } from 'three';
import { LineAnnotation } from '../annotations/LineAnnotation.js';
import { ColorManager } from './ColorManager.js';

const ColorMode = {
	NONE: 0,
	ID: 1,
	LEVEL: 2,
	TILE: 3,
	NAME: 4,
};

const _origin = /* @__PURE__ */ new Vector3();
const _vector = /* @__PURE__ */ new Vector3();
const _col = /* @__PURE__ */ new Color();

// round white sprite used for the anchor points
function createPointTexture() {

	const size = 32;
	const half = size / 2;
	const tex = new DataTexture( new Uint8Array( size * size * 4 ), size, size );
	for ( let x = 0; x < size; x ++ ) {

		for ( let y = 0; y < size; y ++ ) {

			const dx = ( x - half ) / half;
			const dy = ( y - half ) / half;
			const d = Math.sqrt( dx * dx + dy * dy );
			const px = y * size + x;
			tex.image.data[ 4 * px + 0 ] = 255;
			tex.image.data[ 4 * px + 1 ] = 255;
			tex.image.data[ 4 * px + 2 ] = 255;
			tex.image.data[ 4 * px + 3 ] = d < 1 ? 255 : 0;

		}

	}

	tex.needsUpdate = true;
	return tex;

}


// Debug overlay that draws settled line-annotation paths as line segments and their anchors
// as round points, rebuilt each frame into the tiles group (camera-local to avoid jitter).
export class LineAnnotationOverlay {

	get ColorMode() {

		return ColorMode;

	}

	constructor( anchorManager ) {

		this.enabled = false;
		this.colorMode = ColorMode.NONE;
		this.displayLines = true;
		this.displayAnchors = true;

		this.camera = null;
		this.anchorManager = anchorManager;
		this.group = null;

		this._lines = null;
		this._points = null;

	}

	update() {

		const { enabled, group, camera, anchorManager, displayAnchors, displayLines } = this;

		if ( ! enabled ) {

			this.dispose();
			return;

		}

		// lazily create the debug objects
		if ( this._lines === null ) {

			const lines = new LineSegments();
			lines.material.transparent = true;
			lines.material.depthTest = false;
			lines.material.depthWrite = false;
			lines.material.vertexColors = true;
			lines.frustumCulled = false;
			lines.raycast = () => {};

			const points = new Points();
			points.material.transparent = true;
			points.material.depthTest = false;
			points.material.depthWrite = false;
			points.material.map = createPointTexture();
			points.material.size = 6;
			points.material.sizeAttenuation = false;
			points.material.vertexColors = true;
			points.frustumCulled = false;
			points.raycast = () => {};

			group.add( lines, points );
			this._lines = lines;
			this._points = points;

		}

		const { _lines, _points } = this;

		// place near the camera ( group-local ) so vertex coordinates stay small at globe scale
		if ( camera !== null ) {

			_origin.setFromMatrixPosition( camera.matrixWorld );
			group.worldToLocal( _origin );

		} else {

			_origin.set( 0, 0, 0 );

		}

		// settled line paths → segment buffer
		const lineItems = anchorManager.getLines().filter( item => item instanceof LineAnnotation && item.ready );
		let segmentCount = 0;
		for ( const line of lineItems ) {

			segmentCount += line.count - 1;

		}

		const linePosAttr = new BufferAttribute( new Float32Array( segmentCount * 2 * 3 ), 3 );
		const lineColAttr = new BufferAttribute( new Float32Array( segmentCount * 2 * 3 ), 3 );
		let offset = 0;
		for ( const line of lineItems ) {

			this._getColor( line, _col );

			const positions = line.positions;
			for ( let i = 0, l = positions.length - 1; i < l; i ++ ) {

				linePosAttr.setXYZ( offset + 0, ..._vector.copy( positions[ i ] ).sub( _origin ) );
				linePosAttr.setXYZ( offset + 1, ..._vector.copy( positions[ i + 1 ] ).sub( _origin ) );

				lineColAttr.setXYZ( offset + 0, ..._col );
				lineColAttr.setXYZ( offset + 1, ..._col );

				offset += 2;

			}

		}

		// anchors at their active ( highest-LoD settled ) path → point buffer
		const anchorItems = anchorManager.getAnchors().filter( anchor => anchor.ready );

		const pointsPosAttr = new BufferAttribute( new Float32Array( anchorItems.length * 3 ), 3 );
		const pointsColAttr = new BufferAttribute( new Float32Array( anchorItems.length * 2 * 3 ), 3 );

		offset = 0;
		for ( const anchor of anchorItems ) {

			anchor.getPosition( _vector ).sub( _origin );
			pointsPosAttr.setXYZ( offset, ..._vector );

			this._getColor( anchor.getActiveReference().line, _col );
			pointsColAttr.setXYZ( offset, ..._col );

			offset ++;

		}

		_lines.geometry.dispose();
		_lines.geometry.setAttribute( 'position', linePosAttr );
		_lines.geometry.setAttribute( 'color', lineColAttr );
		_lines.position.copy( _origin );
		_lines.updateMatrixWorld();
		_lines.visible = displayLines;

		_points.geometry.dispose();
		_points.geometry.setAttribute( 'position', pointsPosAttr );
		_points.geometry.setAttribute( 'color', pointsColAttr );
		_points.position.copy( _origin );
		_points.updateMatrixWorld();
		_points.visible = displayAnchors;

	}

	dispose() {

		if ( this._lines !== null ) {

			this._lines.removeFromParent();
			this._lines.geometry.dispose();
			this._lines.material.dispose();
			this._lines = null;

		}

		if ( this._points !== null ) {

			this._points.removeFromParent();
			this._points.geometry.dispose();
			this._points.material.dispose();
			this._points.material.map.dispose();
			this._points = null;

		}

	}

	_getColor( line, target ) {

		switch ( this.colorMode ) {

			case ColorMode.ID:
				ColorManager.getColor( line.id, target );
				break;

			case ColorMode.LEVEL:
				ColorManager.getColor( line.lodLevel, target );
				break;

			case ColorMode.NAME:
				ColorManager.getColor( line.properties.name, target );
				break;

			case ColorMode.TILE:
				ColorManager.getColor( ...line.range, target );
				break;

			default:
				target.set( 0xffffff );
				break;


		}

	}

}
