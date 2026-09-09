import { PointsMaterial, Vector3 } from 'three';

/**
 * Width of the active node hierarchy texture - node texels wrap into rows so growing node
 * counts extend the texture height rather than running into the platform width limit.
 */
export const NODES_TEXTURE_WIDTH = 2048;

// Bias applied to the octant selection so quantized points lying exactly on octant planes
// resolve to the same side in every node's frame
const OCTANT_PLANE_BIAS = 0.00005;

/**
 * PointsMaterial that sizes each point by the deepest active node at its position, resolved in
 * the vertex shader by walking a texture encoding the active node hierarchy down from the root.
 * The `size` property is the world-space point spacing of the root level, halved per active
 * level found below the root.
 *
 * Uniforms to assign after construction:
 * - `uActiveNodes`: the hierarchy texture, one texel per node in row-major order with the root
 *   node first and `NODES_TEXTURE_WIDTH` texels per row.
 * - `uNodeSize`: world size of the root cube.
 * - `uNodeMinOffset`: offset from mesh-local vertex positions to root-min-relative positions.
 *
 * @param {Object} [params] PointsMaterial parameters plus the properties below.
 * @param {('square'|'round'|'sphere')} [params.pointShape='round'] Shape of the point sprites.
 *   Spheres additionally write bulged depth values so overlapping points intersect, which has a
 *   fill rate cost. Can be adjusted dynamically.
 * @param {number} [params.minPointSize=2] Smallest projected point size in pixels. Can be
 *   adjusted dynamically.
 * @param {('none'|'node'|'depth')} [params.debugColorMode='none'] Debug visualization - color
 *   each point by a hash of the node it is sized by or by the depth of that node. Can be
 *   adjusted dynamically.
 */
export class PotreePointsMaterial extends PointsMaterial {

	get pointShape() {

		return this._pointShape;

	}

	set pointShape( value ) {

		if ( value !== this._pointShape ) {

			this._pointShape = value;
			this._updateDefines();

		}

	}

	get minPointSize() {

		return this.uniforms.uMinPointSize.value;

	}

	set minPointSize( value ) {

		this.uniforms.uMinPointSize.value = value;

	}

	get debugColorMode() {

		return this._debugColorMode;

	}

	set debugColorMode( value ) {

		if ( value !== this._debugColorMode ) {

			this._debugColorMode = value;
			this._updateDefines();

		}

	}

	constructor( params = {} ) {

		const {
			pointShape = 'round',
			minPointSize = 2,
			debugColorMode = 'none',
			...rest
		} = params;

		super( rest );

		this._pointShape = pointShape;
		this._debugColorMode = debugColorMode;

		this.defines = {};
		this.uniforms = {
			uActiveNodes: { value: null },
			uNodeSize: { value: 1 },
			uNodeMinOffset: { value: new Vector3() },
			uMinPointSize: { value: minPointSize },
		};

		this._updateDefines();

		this.onBeforeCompile = shader => {

			Object.assign( shader.uniforms, this.uniforms );

			shader.vertexShader = shader.vertexShader
				.replace(
					'uniform float size;',
					/* glsl */`
						uniform float size;
						uniform float uMinPointSize;
						uniform sampler2D uActiveNodes;
						uniform float uNodeSize;
						uniform vec3 uNodeMinOffset;

						varying vec3 vViewPosition;
						varying float vRadius;
						varying float vNodeIndex;
						varying float vDepth;

						// number of set bits at or below the given bit index
						float numberOfOnes( float number, float index ) {

							float result = 0.0;
							for ( float i = 0.0; i < 8.0; i ++ ) {

								if ( i > index ) break;
								if ( mod( floor( number / pow( 2.0, i ) ), 2.0 ) != 0.0 ) result ++;

							}

							return result;

						}

						// Walks down the active node hierarchy texture through the octant containing
						// the point, returning the depth of the deepest active node on the path (x)
						// and that node's texel index (y). Adapted from "getLOD" in potree's
						// pointcloud.vs.
						vec2 getActiveDepth( vec3 posInNode ) {

							vec3 offset = vec3( 0.0 );
							float iOffset = 0.0;
							float depth = 0.0;
							for ( float i = 0.0; i < 20.0; i ++ ) {

								int nodeIndex = int( iOffset );
								vec4 value = texelFetch( uActiveNodes, ivec2( nodeIndex % ${ NODES_TEXTURE_WIDTH }, nodeIndex / ${ NODES_TEXTURE_WIDTH } ), 0 );

								// octant of the current node containing the point
								float nodeSize = uNodeSize / pow( 2.0, i );
								vec3 index3d = floor( ( posInNode - offset ) / nodeSize + 0.5 + ${ OCTANT_PLANE_BIAS } );
								float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;

								// stop when the octant holds no active child
								float mask = floor( value.r * 255.0 + 0.5 );
								if ( mod( floor( mask / pow( 2.0, index ) ), 2.0 ) == 0.0 ) {

									break;

								}

								// advance to the child's texel: the parent's first child offset plus
								// the number of active siblings in lower octants
								iOffset +=
									floor( value.g * 255.0 + 0.5 ) * 256.0 +
									floor( value.b * 255.0 + 0.5 ) +
									numberOfOnes( mask, index - 1.0 );
								depth ++;
								offset += nodeSize * 0.5 * index3d;

							}

							return vec2( depth, iOffset );

						}
					`
				)
				.replace(
					'#include <logdepthbuf_vertex>',
					/* glsl */`
						// scale the point by the deepest active node it falls in
						vec2 activeResult = getActiveDepth( position + uNodeMinOffset );
						float worldSize = size / pow( 2.0, activeResult.x );

						gl_PointSize = worldSize * ( scale / - mvPosition.z );
						gl_PointSize = max( gl_PointSize, uMinPointSize );

						// Half the view-space width the sprite actually covers, including the pixel
						// clamp. The "scale" sizing uniform is half the viewport height with no fov
						// factor so the projection's y scale converts pixels to view units.
						vViewPosition = mvPosition.xyz;
						vRadius = 0.5 * gl_PointSize * ( - mvPosition.z ) / ( scale * projectionMatrix[ 1 ][ 1 ] );
						vNodeIndex = activeResult.y;
						vDepth = activeResult.x;

						#include <logdepthbuf_vertex>
					`
				);

			shader.fragmentShader = shader.fragmentShader
				.replace(
					'uniform float opacity;',
					/* glsl */`
					uniform float opacity;
					uniform mat4 projectionMatrix;

					varying vec3 vViewPosition;
					varying float vRadius;
					varying float vNodeIndex;
					varying float vDepth;
					`
				)
				.replace(
					'#include <color_fragment>',
					/* glsl */`
					#include <color_fragment>

					// color each point by a hash of the node it is sized by
					#ifdef DEBUG_NODE_COLORS

						float id = vNodeIndex + 1.0;
						diffuseColor.rgb = vec3(
							fract( sin( id * 12.9898 ) * 43758.5453 ),
							fract( sin( id * 78.2330 ) * 12543.2341 ),
							fract( sin( id * 3.7010 ) * 26445.3450 )
						);

					#endif

					// color each point by the depth of the node it is sized by, one hue per level
					#ifdef DEBUG_DEPTH_COLORS

						float hue = vDepth / 8.0;
						diffuseColor.rgb = clamp( abs( fract( hue + vec3( 0.0, 2.0 / 3.0, 1.0 / 3.0 ) ) * 6.0 - 3.0 ) - 1.0, 0.0, 1.0 );

					#endif
					`
				)
				.replace(
					'#include <clipping_planes_fragment>',
					/* glsl */`
					#include <clipping_planes_fragment>

					#if defined( ROUND_POINTS ) || defined( SPHERE_POINTS )

						vec2 pointOffset = gl_PointCoord * 2.0 - 1.0;

					#endif

					#ifdef ROUND_POINTS

						// discard the sprite corners so points draw as circles
						if ( dot( pointOffset, pointOffset ) > 1.0 ) discard;

					#endif

					#ifdef SPHERE_POINTS

						// Intersect the view ray through this fragment with the point's sphere and
						// write the depth of the intersection so overlapping points meet as solid
						// spheres fixed in space. The fragment's view position lies on the sprite
						// plane at the point's depth.
						vec3 rayDir = normalize( vViewPosition + vec3( pointOffset * vRadius, 0.0 ) );
						float rayDot = dot( vViewPosition, rayDir );
						float disc = rayDot * rayDot - dot( vViewPosition, vViewPosition ) + vRadius * vRadius;
						if ( disc < 0.0 ) discard;

						vec4 clipPos = projectionMatrix * vec4( rayDir * ( rayDot - sqrt( disc ) ), 1.0 );
						gl_FragDepth = ( clipPos.z / clipPos.w ) * 0.5 + 0.5;

					#endif
					`
				);

		};

	}

	// Set the shader feature defines for the current point shape and debug settings
	_updateDefines() {

		const { defines } = this;
		delete defines.ROUND_POINTS;
		delete defines.SPHERE_POINTS;
		delete defines.DEBUG_NODE_COLORS;
		delete defines.DEBUG_DEPTH_COLORS;

		if ( this._pointShape === 'round' ) defines.ROUND_POINTS = '';
		if ( this._pointShape === 'sphere' ) defines.SPHERE_POINTS = '';
		if ( this._debugColorMode === 'node' ) defines.DEBUG_NODE_COLORS = '';
		if ( this._debugColorMode === 'depth' ) defines.DEBUG_DEPTH_COLORS = '';

		this.needsUpdate = true;

	}

}
