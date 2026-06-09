import { BufferAttribute, BufferGeometry, Matrix4, Points, Vector2, Vector3, Vector4 } from 'three';
import { GlyphAtlasTexture } from '3d-tiles-renderer/plugins';
import { GlyphMaterial } from './GlyphMaterial.js';

const _viewport = /* @__PURE__ */ new Vector4();
const _mvMatrix = /* @__PURE__ */ new Matrix4();
const _point4 = /* @__PURE__ */ new Vector4();
const _ssOrigin = /* @__PURE__ */ new Vector4();
const _ssRay = /* @__PURE__ */ new Vector2();
const _ssPoint = /* @__PURE__ */ new Vector2();
const _worldPoint = /* @__PURE__ */ new Vector3();

export class AnnotationPoints extends Points {

	get size() {

		return this.material.size;

	}

	set size( v ) {

		this.material.size = v;

	}

	constructor( options = {} ) {

		const {
			getKind = () => null,
			size = 20,
			glyphSize = 20,
			slotCount = 64,
		} = options;


		super( new BufferGeometry(), new GlyphMaterial() );

		this.getKind = getKind;

		this.renderOrder = 1000;
		this.frustumCulled = false;

		this.fadeInDuration = 0.3;
		this.fadeOutDuration = 0.3;
		this.size = size;

		// Viewport size in pixels — must be kept current by the owner (plugin updates each frame).
		this.resolution = new Vector2();

		// Map<itemId, entry> — keyed by stable id, not object reference.
		// entry: { item, fade: 0..1, state: 'in' | 'visible' | 'out' }
		this._entryMap = new Map();
		this._orderedEntries = [];
		this.needsUpdate = false;
		this._lastUpdateTime = - 1;

		this.glyphAtlas = new GlyphAtlasTexture( slotCount, glyphSize );
		this.material.glyphTexture = this.glyphAtlas;
		this.glyphAtlas.getSlotSize( this.material.glyphCellSize );

	}

	onBeforeRender( renderer, scene, camera ) {

		const { resolution } = this;

		// use the active viewport (not getDrawingBufferSize) so raycasting matches the GPU's NDC→pixel mapping in sub-viewport scenarios
		renderer.getViewport( _viewport );
		resolution.set( _viewport.z, _viewport.w );

	}

	onAfterRender( renderer, scene, camera ) {

		const { parent } = this;

		// transform the root of this object to be near the camera to avoid gpu jitter
		if ( parent ) {

			_mvMatrix.copy( parent.matrixWorld ).invert();

		} else {

			_mvMatrix.identity();

		}

		this.position.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _mvMatrix );
		this.updateMatrixWorld( true );

	}

	// Call when the occupation manager fires a change. Returns true while any point is still animating.
	update( added, removed ) {

		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		// Add new items, update LoD-swapped references, reverse in-progress fade-outs.
		const { _entryMap, _orderedEntries } = this;
		for ( const item of added ) {

			const existing = _entryMap.get( item.id );
			if ( ! existing ) {

				const entry = { item, fade: 0, state: 'in' };
				_entryMap.set( item.id, entry );
				_orderedEntries.push( entry );

			} else {

				existing.item = item; // keep reference fresh (LoD swap)
				if ( existing.state === 'out' ) existing.state = 'in';

			}

		}

		// Start fade-out for removed items.
		for ( const item of removed ) {

			const entry = _entryMap.get( item.id );
			if ( entry && entry.state !== 'out' ) {

				entry.state = 'out';

			}

		}

		// Tick fades; collect fully-faded-out items for removal.
		const toRemove = [];
		for ( const [ id, entry ] of _entryMap ) {

			if ( entry.state === 'in' ) {

				entry.fade = Math.min( 1, entry.fade + dt / this.fadeInDuration );
				if ( entry.fade >= 1 ) {

					entry.state = 'visible';

				}

			} else if ( entry.state === 'out' ) {

				entry.fade = Math.max( 0, entry.fade - dt / this.fadeOutDuration );
				if ( entry.fade <= 0 ) {

					toRemove.push( id );

				}

			}

		}

		if ( toRemove.length > 0 ) {

			for ( const id of toRemove ) {

				_entryMap.delete( id );

			}

			this._orderedEntries = _orderedEntries.filter( e => _entryMap.has( e.item.id ) );

		}

		this._updateGeometry();

	}

	raycast( raycaster, intersects ) {

		const camera = raycaster.camera;
		if ( ! camera ) return;

		const { geometry, material, matrixWorld, resolution } = this;
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

		for ( let i = 0, l = this.geometry.drawRange.count; i < l; i ++ ) {

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

	}

	_updateGeometry() {

		const origin = this.position;
		const entries = this._orderedEntries;
		const count = entries.length;

		const { geometry, getKind, glyphAtlas } = this;
		let posAttr = geometry.getAttribute( 'position' );
		if ( ! posAttr || posAttr.count < count ) {

			geometry.dispose();
			posAttr = new BufferAttribute( new Float32Array( count * 3 ), 3 );
			geometry.setAttribute( 'position', posAttr );
			geometry.setAttribute( 'glyphUV', new BufferAttribute( new Float32Array( count * 2 ), 2 ) );
			geometry.setAttribute( 'alpha', new BufferAttribute( new Float32Array( count ), 1 ) );

		}

		geometry.setDrawRange( 0, count );

		const glyphUVAttr = geometry.getAttribute( 'glyphUV' );
		const alphaAttr = geometry.getAttribute( 'alpha' );
		for ( let i = 0; i < count; i ++ ) {

			const { item, fade } = entries[ i ];
			const pos = item.position;
			posAttr.setXYZ( i, pos.x - origin.x, pos.y - origin.y, pos.z - origin.z );

			const kind = getKind( item.layer, item.properties );
			if ( kind !== null && glyphAtlas.has( kind ) ) {

				const uv = glyphAtlas.getUV( kind );
				glyphUVAttr.setXY( i, uv.x, uv.y );

			} else {

				glyphUVAttr.setXY( i, - 1, - 1 );

			}

			alphaAttr.setX( i, fade );

		}

		posAttr.needsUpdate = true;
		glyphUVAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;

	}

}
