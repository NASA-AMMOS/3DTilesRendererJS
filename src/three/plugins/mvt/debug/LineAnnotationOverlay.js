import { BufferAttribute, DataTexture, LineSegments, Points, Vector3 } from 'three';
import { LineAnnotation } from '../annotations/LineAnnotation.js';

const _origin = /* @__PURE__ */ new Vector3();
const _vector = /* @__PURE__ */ new Vector3();
const _anchorList = [];

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

	constructor( anchorManager ) {

		this.enabled = false;
		this.camera = null;

		this.settlingManager = null;
		this.anchorManager = anchorManager;
		this.group = null;

		this._lines = null;
		this._points = null;

	}

	update() {

		const { enabled, group, camera, settlingManager, anchorManager } = this;

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
			lines.frustumCulled = false;
			lines.raycast = () => {};

			const points = new Points();
			points.material.transparent = true;
			points.material.depthTest = false;
			points.material.depthWrite = false;
			points.material.map = createPointTexture();
			points.material.size = 6;
			points.material.sizeAttenuation = false;
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
		const lineItems = settlingManager.getItems().filter( item => item instanceof LineAnnotation && item.ready );

		let segmentCount = 0;
		for ( const line of lineItems ) {

			segmentCount += line.count - 1;

		}

		const posAttr = new BufferAttribute( new Float32Array( segmentCount * 2 * 3 ), 3 );
		let offset = 0;
		for ( const line of lineItems ) {

			const ps = line.positions;
			for ( let i = 0, l = ps.length - 1; i < l; i ++ ) {

				posAttr.setXYZ( offset ++, ..._vector.copy( ps[ i ] ).sub( _origin ) );
				posAttr.setXYZ( offset ++, ..._vector.copy( ps[ i + 1 ] ).sub( _origin ) );

			}

		}

		// anchors at their active ( highest-LoD settled ) path → point buffer
		const anchorItems = anchorManager.getAnchors( _anchorList ).filter( anchor => anchor.ready );

		const pointsAttr = new BufferAttribute( new Float32Array( anchorItems.length * 3 ), 3 );
		offset = 0;
		for ( const anchor of anchorItems ) {

			anchor.getPosition( _vector ).sub( _origin );
			pointsAttr.setXYZ( offset ++, ..._vector );

		}

		_lines.geometry.dispose();
		_lines.geometry.setAttribute( 'position', posAttr );
		_lines.position.copy( _origin );
		_lines.updateMatrixWorld();

		_points.geometry.dispose();
		_points.geometry.setAttribute( 'position', pointsAttr );
		_points.position.copy( _origin );
		_points.updateMatrixWorld();

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

}
