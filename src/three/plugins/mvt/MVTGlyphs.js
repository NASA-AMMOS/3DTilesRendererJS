/** @import { MVTGlyphAtlasTexture } from './MVTGlyphAtlasTexture.js'; */
import { BufferAttribute, BufferGeometry, GreaterDepth, Group, Matrix4, Points, Vector2, Vector3, Vector4 } from 'three';
import { MVTGlyphMaterial } from './MVTGlyphMaterial.js';

const _mvMatrix = /* @__PURE__ */ new Matrix4();
const _uvTarget = {};

// scratch reused across raycasts
const _point4 = /* @__PURE__ */ new Vector4();
const _ssOrigin = /* @__PURE__ */ new Vector4();
const _ssRay = /* @__PURE__ */ new Vector2();
const _ssPoint = /* @__PURE__ */ new Vector2();
const _worldPoint = /* @__PURE__ */ new Vector3();

/**
 * @typedef {Object} MVTDrawModeEnum
 * @property {number} OBSCURED - Depth-tested, so glyphs are hidden where behind terrain.
 * @property {number} DRAW_THROUGH - Visible parts drawn opaque, parts behind terrain ghosted on top.
 * @property {number} OVERLAY - Always drawn on top of everything.
 */

const DRAW_MODE = /* @__PURE__ */ Object.freeze( {
	OBSCURED: 0,
	DRAW_THROUGH: 1,
	OVERLAY: 2,
} );

/**
 * Base object that renders a batch of glyphs from a shared `MVTGlyphAtlasTexture`, fading each item
 * in and out. Manages the geometry and two child draws sharing it: an opaque pass and a transparent
 * "draw through" pass, combined per `drawMode`.
 * @extends Group
 */
export class MVTGlyphs extends Group {

	/**
	 * The draw modes assignable to `drawMode`.
	 * @type {MVTDrawModeEnum}
	 */
	static get DrawMode() {

		return DRAW_MODE;

	}

	/**
	 * Glyph size in pixels.
	 * @type {number}
	 */
	get size() {

		return this._opaque.material.size;

	}

	set size( v ) {

		this._opaque.material.size = v;
		this._drawThrough.material.size = v;

	}

	/**
	 * The texture atlas used for rendering glyphs.
	 * @type {MVTGlyphAtlasTexture}
	 */
	get glyphAtlas() {

		return this._opaque.material.glyphAtlas;

	}

	/**
	 * How glyphs interact with the depth buffer; one of `MVTGlyphs.DrawMode`.
	 * @type {number}
	 */
	get drawMode() {

		return this._drawMode;

	}

	set drawMode( mode ) {

		this._drawMode = mode;
		this._applyDrawMode();

	}

	get geometry() {

		return this._opaque.geometry;

	}

	constructor( material ) {

		super();

		this.frustumCulled = false;

		/**
		 * Seconds a glyph takes to fade in.
		 * @type {number}
		 */
		this.fadeInDuration = 0.3;

		/**
		 * Seconds a glyph takes to fade out.
		 * @type {number}
		 */
		this.fadeOutDuration = 0.3;

		/**
		 * Opacity of the ghosted, drawThrough glyphs in the `DRAW_THROUGH` draw mode.
		 * @type {number}
		 */
		this.drawThroughOpacity = 0.5;

		// Map<itemId, { item, fade: 0..1, state: 'in' | 'visible' | 'out' }> keyed by stable id,
		// plus an insertion-ordered list of the same entries for stable geometry layout
		this._entryMap = new Map();
		this._orderedEntries = [];
		this._lastUpdateTime = - 1;
		this._lastCamera = null;

		// create children for draw through
		const geometry = new BufferGeometry();
		const opaque = new Points( geometry, new MVTGlyphMaterial() );
		opaque.frustumCulled = false;
		opaque.renderOrder = 1000;
		opaque.onAfterRender = ( renderer, scene, camera ) => {

			this._lastCamera = camera;

		};

		const drawThrough = new Points( geometry, new MVTGlyphMaterial() );
		drawThrough.frustumCulled = false;
		drawThrough.material.glyphAtlas = opaque.material.glyphAtlas;
		drawThrough.renderOrder = 1001;
		drawThrough.onAfterRender = ( renderer, scene, camera ) => {

			this._lastCamera = camera;

		};

		// add the children
		this.add( drawThrough, opaque );

		// store references, update draw mode
		this._opaque = opaque;
		this._drawThrough = drawThrough;
		this.drawMode = DRAW_MODE.OVERLAY;

	}

	/**
	 * Disposes the glyph atlas, geometry, and materials.
	 * @returns {void}
	 */
	dispose() {

		this.glyphAtlas.dispose();
		this.geometry.dispose();
		this._opaque.material.dispose();
		this._drawThrough.material.dispose();

	}

	/**
	 * Updates the rendered glyphs from a frame's visibility changes and advances the fades. Call
	 * once per frame.
	 * @private
	 * @param {Iterable<Object>} added - Items that became visible, each with a stable `id`.
	 * @param {Iterable<Object>} removed - Items that became hidden.
	 * @returns {void}
	 */
	update( added, removed ) {

		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		const { _entryMap, _orderedEntries, fadeInDuration, fadeOutDuration } = this;

		for ( const item of added ) {

			const existing = _entryMap.get( item.id );
			if ( ! existing ) {

				const entry = { item, fade: 0, state: 'in' };
				_entryMap.set( item.id, entry );
				_orderedEntries.push( entry );

			} else {

				// keep reference fresh (LoD swap)
				existing.item = item;
				if ( existing.state === 'out' ) existing.state = 'in';

			}

		}

		for ( const item of removed ) {

			const entry = _entryMap.get( item.id );
			if ( entry && entry.state !== 'out' ) {

				entry.state = 'out';

			}

		}

		let didRemove = false;
		for ( const [ id, entry ] of _entryMap ) {

			if ( entry.state === 'in' ) {

				entry.fade = Math.min( 1, entry.fade + dt / fadeInDuration );
				if ( entry.fade >= 1 ) {

					entry.state = 'visible';

				}

			} else if ( entry.state === 'out' ) {

				entry.fade = Math.max( 0, entry.fade - dt / fadeOutDuration );
				if ( entry.fade <= 0 ) {

					_entryMap.delete( id );
					didRemove = true;

				}

			}

		}

		if ( didRemove ) {

			this._orderedEntries = _orderedEntries.filter( e => _entryMap.has( e.item.id ) );

		}

		this._recenter();
		this._updateGeometry();

	}

	raycast( raycaster, intersects ) {

		const camera = raycaster.camera;
		if ( ! camera ) return;

		const { geometry, matrixWorld } = this;
		const { material } = this._opaque;
		const { resolution } = material;
		const posAttr = geometry.getAttribute( 'position' );
		if ( ! posAttr || posAttr.count === 0 ) return;

		const pointRadius = material.size / 2; // pixels
		const near = - camera.near;

		// Project a point 1 unit along the ray into screen space for 2D comparison.
		// Using the same centered screen-space convention as LineSegments2
		// (NDC * resolution/2, NOT NDC * resolution/2 + resolution/2).
		raycaster.ray.at( 1, _ssOrigin );
		_ssOrigin.w = 1;
		_ssOrigin.applyMatrix4( camera.matrixWorldInverse );
		_ssOrigin.applyMatrix4( camera.projectionMatrix );
		_ssOrigin.multiplyScalar( 1 / _ssOrigin.w );
		_ssRay.set( _ssOrigin.x * resolution.x / 2, _ssOrigin.y * resolution.y / 2 );

		_mvMatrix.multiplyMatrices( camera.matrixWorldInverse, matrixWorld );

		for ( let i = 0, l = geometry.drawRange.count; i < l; i ++ ) {

			_point4.fromBufferAttribute( posAttr, i );
			_point4.w = 1;

			// camera space
			_point4.applyMatrix4( _mvMatrix );

			// skip if behind near plane
			if ( _point4.z > near ) continue;

			// clip → NDC
			_point4.applyMatrix4( camera.projectionMatrix );
			_point4.multiplyScalar( 1 / _point4.w );

			// skip if outside depth clip bounds
			if ( _point4.z < - 1 || _point4.z > 1 ) continue;

			// centered screen space
			_ssPoint.set( _point4.x * resolution.x / 2, _point4.y * resolution.y / 2 );

			if ( _ssRay.distanceTo( _ssPoint ) > pointRadius ) continue;

			// hit — record 3D world position and distance along ray
			_worldPoint.fromBufferAttribute( posAttr, i ).applyMatrix4( matrixWorld );

			const entry = this._orderedEntries[ i ];
			intersects.push( {
				distance: raycaster.ray.origin.distanceTo( _worldPoint ),
				point: _worldPoint.clone(),
				index: i,
				face: null,
				faceIndex: null,
				object: this,
				layer: entry?.item.layer ?? null,
				properties: entry?.item.properties ?? null,
			} );

		}

		// end traversal
		return false;

	}

	// configure the two child draws for the current draw mode
	_applyDrawMode() {

		const { _opaque, _drawThrough, drawThroughOpacity, _drawMode } = this;
		switch ( _drawMode ) {

			case DRAW_MODE.OVERLAY:
				_opaque.visible = true;
				_opaque.material.depthTest = false;

				_drawThrough.visible = false;
				break;

			case DRAW_MODE.DRAW_THROUGH:
				_opaque.visible = true;
				_opaque.material.depthTest = true;

				_drawThrough.visible = true;
				_drawThrough.material.opacity = drawThroughOpacity;
				_drawThrough.material.depthFunc = GreaterDepth;
				break;

			case DRAW_MODE.OBSCURED:
			default:
				_opaque.visible = true;
				_opaque.material.depthTest = true;

				_drawThrough.visible = false;
				break;

		}

	}

	// keep the root near the camera to avoid gpu jitter at globe scale
	_recenter() {

		const { parent, _lastCamera } = this;
		if ( ! _lastCamera ) {

			this.position.set( 0, 0, 0 );
			this.updateMatrixWorld( true );

		}

		if ( parent ) {

			_mvMatrix.copy( parent.matrixWorld ).invert();

		} else {

			_mvMatrix.identity();

		}

		this.position.setFromMatrixPosition( _lastCamera.matrixWorld ).applyMatrix4( _mvMatrix );
		this.updateMatrixWorld( true );

	}

	// subclasses build their geometry from here
	_updateGeometry() {}

	// resize the shared per-glyph attribute buffers to hold `count` glyphs if necessary and set the draw
	// range
	_resizeGeometry( count ) {

		const { geometry } = this;
		const posAttr = geometry.getAttribute( 'position' );
		if ( ! posAttr || posAttr.count < count ) {

			geometry.dispose();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( count * 3 ), 3 ) );
			geometry.setAttribute( 'glyphUV', new BufferAttribute( new Float32Array( count * 2 ), 2 ) );
			geometry.setAttribute( 'alpha', new BufferAttribute( new Float32Array( count ), 1 ) );
			geometry.setAttribute( 'angle', new BufferAttribute( new Float32Array( count ), 1 ) );

		}

		geometry.setDrawRange( 0, count );

	}

	// write a single glyph's attributes; position is stored relative to this.position ( the
	// camera-local origin ) and `key` looks up the atlas slot, or -1 when it isn't present
	_writeGlyph( i, pos, key, fade, angle = 0 ) {

		const { geometry, glyphAtlas } = this;
		const origin = this.position;
		const {
			position: posAttr,
			glyphUV: uvAttr,
			alpha: alphaAttr,
			angle: angleAttr,
		} = geometry.attributes;

		posAttr.setXYZ( i, pos.x - origin.x, pos.y - origin.y, pos.z - origin.z );

		if ( key !== null && glyphAtlas.has( key ) ) {

			const uv = glyphAtlas.getUV( key, _uvTarget );
			uvAttr.setXY( i, uv.x, uv.y );

		} else {

			uvAttr.setXY( i, - 1, - 1 );

		}

		alphaAttr.setX( i, fade );
		angleAttr.setX( i, angle );

	}

	// flag the per-glyph attributes for upload
	_markNeedsUpdate() {

		const { geometry } = this;
		geometry.getAttribute( 'position' ).needsUpdate = true;
		geometry.getAttribute( 'glyphUV' ).needsUpdate = true;
		geometry.getAttribute( 'alpha' ).needsUpdate = true;
		geometry.getAttribute( 'angle' ).needsUpdate = true;

	}

}
