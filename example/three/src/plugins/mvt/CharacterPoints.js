import { BufferAttribute, BufferGeometry, Matrix4, Points } from 'three';
import { GlyphAtlasTexture } from '3d-tiles-renderer/plugins';
import { GlyphMaterial } from './GlyphMaterial.js';

const _mvMatrix = /* @__PURE__ */ new Matrix4();

// Draws one glyph per character for the currently-visible text anchors. Each anchor's
// `characterPositions` (and the characters in its `text`) are recomputed every frame by its
// evaluate(), so the geometry is rebuilt on every update. Glyphs are rasterized lazily into a
// shared atlas the first time a character is seen. ( Orientation / kerning come later. )
export class CharacterPoints extends Points {

	constructor( options = {} ) {

		const {
			size = 16,
			glyphSize = 32,
			slotCount = 256,
			font = null,
			strokeStyle = 'black',
			strokeWidth = null,
		} = options;

		super( new BufferGeometry(), new GlyphMaterial( { size } ) );

		this.renderOrder = 1001;
		this.frustumCulled = false;

		// currently-visible text anchors
		this._anchors = new Set();

		// CSS font used to rasterize glyphs, sized to fit the atlas slot
		this._font = font ?? `400 ${ Math.round( glyphSize * 0.7 ) }px sans-serif`;

		// black halo so glyphs read over the imagery
		this._strokeStyle = strokeStyle;
		this._strokeWidth = strokeWidth ?? Math.max( 1, Math.round( glyphSize * 0.08 ) );

		this.glyphAtlas = new GlyphAtlasTexture( slotCount, glyphSize );
		this.material.glyphTexture = this.glyphAtlas;
		this.glyphAtlas.getSlotSize( this.material.glyphCellSize );

	}

	update( added, removed ) {

		const { _anchors } = this;
		for ( const item of added ) {

			_anchors.add( item );

		}

		for ( const item of removed ) {

			_anchors.delete( item );

		}

		this._updateGeometry();

	}

	onAfterRender( renderer, scene, camera ) {

		// keep the root near the camera to avoid gpu jitter at globe scale
		const { parent } = this;
		if ( parent ) {

			_mvMatrix.copy( parent.matrixWorld ).invert();

		} else {

			_mvMatrix.identity();

		}

		this.position.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _mvMatrix );
		this.updateMatrixWorld( true );

	}

	// uv bounds of the glyph for `char`, rasterizing it into the atlas on first use
	_glyphUV( char ) {

		const { glyphAtlas } = this;
		if ( ! glyphAtlas.has( char ) ) {

			glyphAtlas.drawChar( char, char, {
				font: this._font,
				color: 'white',
				strokeStyle: this._strokeStyle,
				strokeWidth: this._strokeWidth,
			} );

		}

		return glyphAtlas.getUV( char );

	}

	_updateGeometry() {

		const origin = this.position;
		const { _anchors, geometry } = this;

		// total visible character count
		let count = 0;
		for ( const anchor of _anchors ) {

			count += anchor.characterPositions.length;

		}

		let posAttr = geometry.getAttribute( 'position' );
		let glyphUVAttr = geometry.getAttribute( 'glyphUV' );
		let alphaAttr = geometry.getAttribute( 'alpha' );
		if ( ! posAttr || posAttr.count < count ) {

			geometry.dispose();
			posAttr = new BufferAttribute( new Float32Array( count * 3 ), 3 );
			glyphUVAttr = new BufferAttribute( new Float32Array( count * 2 ), 2 );
			alphaAttr = new BufferAttribute( new Float32Array( count ), 1 );
			geometry.setAttribute( 'position', posAttr );
			geometry.setAttribute( 'glyphUV', glyphUVAttr );
			geometry.setAttribute( 'alpha', alphaAttr );

		}

		geometry.setDrawRange( 0, count );

		let i = 0;
		for ( const anchor of _anchors ) {

			const positions = anchor.characterPositions;
			const text = anchor.text;
			for ( let c = 0, l = positions.length; c < l; c ++ ) {

				const p = positions[ c ];
				posAttr.setXYZ( i, p.x - origin.x, p.y - origin.y, p.z - origin.z );

				const uv = this._glyphUV( text[ c ] );
				if ( uv !== null ) {

					glyphUVAttr.setXY( i, uv.x, uv.y );

				} else {

					glyphUVAttr.setXY( i, - 1, - 1 );

				}

				alphaAttr.setX( i, 1 );
				i ++;

			}

		}

		posAttr.needsUpdate = true;
		glyphUVAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;

	}

}
