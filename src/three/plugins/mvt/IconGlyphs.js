import { BufferAttribute, Matrix4, Vector2, Vector3, Vector4 } from 'three';
import { GlyphMaterial } from './GlyphMaterial.js';
import { Glyphs } from './Glyphs.js';

const _viewport = /* @__PURE__ */ new Vector4();
const _mvMatrix = /* @__PURE__ */ new Matrix4();
const _point4 = /* @__PURE__ */ new Vector4();
const _ssOrigin = /* @__PURE__ */ new Vector4();
const _ssRay = /* @__PURE__ */ new Vector2();
const _ssPoint = /* @__PURE__ */ new Vector2();
const _worldPoint = /* @__PURE__ */ new Vector3();

export class IconGlyphs extends Glyphs {

	constructor( options = {} ) {

		const {
			getKind = () => null,
			size = 18,
			glyphSize = 18 * window.devicePixelRatio,
			slotCount = 64,
		} = options;

		super( new GlyphMaterial() );

		this.getKind = getKind;
		this.size = size;

		// Viewport size in pixels — must be kept current by the owner (plugin updates each frame).
		this.resolution = new Vector2();
		this.needsUpdate = false;

		this.glyphAtlas.resize( slotCount, glyphSize );

	}

	onBeforeRender( renderer, scene, camera ) {

		const { resolution } = this;

		// use the active viewport (not getDrawingBufferSize) so raycasting matches the GPU's NDC→pixel mapping in sub-viewport scenarios
		renderer.getViewport( _viewport );
		resolution.set( _viewport.z, _viewport.w );

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
