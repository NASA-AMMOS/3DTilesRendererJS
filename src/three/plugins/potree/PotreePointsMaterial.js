import { PointsMaterial, Vector2, Vector3 } from 'three';

// Width of the hierarchy texture. Texels wrap into rows so it grows in height, not width.
export const NODES_TEXTURE_WIDTH = 2048;

// Resolves points lying exactly on an octant plane the same way in every node's frame
const OCTANT_PLANE_BIAS = 0.00005;

/**
 * PointsMaterial that sizes each point by the deepest active node containing it, found by walking
 * the hierarchy texture in the vertex shader. `size` is the root level point spacing, halved per
 * active level below the root.
 *
 * Assign after construction: `uActiveNodes`, `uNodeSize` and `uNodeMinOffset`.
 *
 * All the properties below can be adjusted after construction.
 * @param {Object} [params] PointsMaterial parameters plus the properties below.
 * @param {('square'|'round'|'sphere')} [params.pointShape='round'] Sprite shape. Spheres write bulged depth so overlapping points intersect, at a fill rate cost.
 * @param {number} [params.minPointSize=2] Smallest projected point size in pixels.
 * @param {number} [params.edlStrength=0] Eye dome lighting falloff rate. Zero compiles the effect out.
 * @param {number} [params.edlRadius=1.4] Radius of the eye dome lighting neighbour ring in pixels.
 * @param {('none'|'node'|'depth'|'tile')} [params.debugColorMode='none'] Color points by the node they are sized by, that node's depth, or the tile they came from.
 * @private
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

	get edlStrength() {

		return this.uniforms.uEdlStrength.value;

	}

	// zero compiles the effect out rather than scaling it to nothing
	set edlStrength( value ) {

		const wasEnabled = this.uniforms.uEdlStrength.value > 0;
		this.uniforms.uEdlStrength.value = value;
		if ( wasEnabled !== value > 0 ) this._updateDefines();

	}

	get edlRadius() {

		return this.uniforms.uEdlRadius.value;

	}

	set edlRadius( value ) {

		this.uniforms.uEdlRadius.value = value;

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
			edlStrength = 0,
			edlRadius = 1.4,
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
			uTileId: { value: 0 },

			uEdlTexture: { value: null },
			uEdlResolution: { value: new Vector2( 1, 1 ) },
			uEdlStrength: { value: edlStrength },
			uEdlRadius: { value: edlRadius },
			uEdlDepthPass: { value: false },
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
						uniform usampler2D uActiveNodes;
						uniform float uNodeSize;
						uniform vec3 uNodeMinOffset;

						varying vec3 vViewPosition;
						varying float vRadius;
						varying float vNodeId;
						varying float vDepth;
						varying float vLogDepth;

						// number of set bits below the given bit index
						uint numberOfOnes( uint mask, int index ) {

							uint bitsBelow = mask & ( ( 1u << uint( index ) ) - 1u );
							uint count = 0u;
							for ( int i = 0; i < 8; i ++ ) {

								count += ( bitsBelow >> uint( i ) ) & 1u;

							}

							return count;

						}

						// Walks the hierarchy texture through the octants containing the point,
						// returning the deepest active depth (x), an id for that node (y) and its
						// lod offset (z). The id comes from the octant path rather than the texel
						// index so it stays stable as the texture is re-encoded. Adapted from
						// "getLOD" in potree's pointcloud.vs.
						vec3 getActiveDepth( vec3 posInNode ) {

							vec3 offset = vec3( 0.0 );
							int nodeIndex = 0;
							int depth = 0;
							uint nodePath = 0u;
							float lodOffset = 0.0;
							for ( int i = 0; i < 20; i ++ ) {

								uvec4 value = texelFetch( uActiveNodes, ivec2( nodeIndex % ${ NODES_TEXTURE_WIDTH }, nodeIndex / ${ NODES_TEXTURE_WIDTH } ), 0 );

								// octant of the current node containing the point
								float nodeSize = uNodeSize / pow( 2.0, float( i ) );
								vec3 index3d = floor( ( posInNode - offset ) / nodeSize + 0.5 + ${ OCTANT_PLANE_BIAS } );
								int index = int( 4.0 * index3d.x + 2.0 * index3d.y + index3d.z );

								// stop when the octant holds no active child
								uint mask = value.r;
								if ( ( ( mask >> uint( index ) ) & 1u ) == 0u ) {

									lodOffset = float( value.a ) / 10.0 - 10.0;
									break;

								}

								// child texel: the first child offset plus the active siblings below it
								nodeIndex += int( value.g * 256u + value.b + numberOfOnes( mask, index ) );
								depth ++;
								offset += nodeSize * 0.5 * index3d;

								// offset by one so trailing zeroes still change the id
								nodePath = nodePath * 8u + uint( index ) + 1u;

							}

							// kept under 2^24 so the id survives the trip through a float varying
							return vec3( float( depth ), float( nodePath % 16777216u ), lodOffset );

						}
					`
				)
				.replace(
					'#include <logdepthbuf_vertex>',
					/* glsl */`
						// size by the deepest active node, shifted by its density lod offset
						vec3 activeResult = getActiveDepth( position + uNodeMinOffset );
						float worldSize = size / pow( 2.0, activeResult.x + activeResult.z );

						// three's "scale" omits the 1 / tan( fov / 2 ) term, so its attenuation is
						// not world scale. The projection y scale restores it, as potree does.
						float projFactor = scale * projectionMatrix[ 1 ][ 1 ] / - mvPosition.z;
						gl_PointSize = worldSize * projFactor;
						gl_PointSize = max( gl_PointSize, uMinPointSize );

						vViewPosition = mvPosition.xyz;
						vNodeId = activeResult.y;
						vDepth = activeResult.x;

						// half the world size the sprite covers, including the pixel clamp
						vRadius = 0.5 * gl_PointSize / projFactor;
						vLogDepth = log2( - mvPosition.z );

						#include <logdepthbuf_vertex>
					`
				);

			shader.fragmentShader = shader.fragmentShader
				.replace(
					'uniform float opacity;',
					/* glsl */`
					uniform float opacity;
					uniform mat4 projectionMatrix;
					uniform float uTileId;

					varying vec3 vViewPosition;
					varying float vRadius;
					varying float vNodeId;
					varying float vDepth;
					varying float vLogDepth;

					#ifdef EDL_ENABLED

						uniform sampler2D uEdlTexture;
						uniform vec2 uEdlResolution;
						uniform float uEdlStrength;
						uniform float uEdlRadius;
						uniform bool uEdlDepthPass;

						// Darken by how far this point sits behind a ring of neighbours in the
						// pre-pass target. Adapted from potree's "edl.fs".
						float edlShade( float logDepth ) {

							vec2 uv = gl_FragCoord.xy / uEdlResolution;
							vec2 uvRadius = uEdlRadius / uEdlResolution;

							float sum = 0.0;
							for ( int i = 0; i < 8; i ++ ) {

								float angle = 6.2831853 * float( i ) / 8.0;
								vec2 offset = uvRadius * vec2( cos( angle ), sin( angle ) );
								float neighbourDepth = texture2D( uEdlTexture, uv + offset ).r;

								// zero means nothing was drawn there, so it contributes nothing
								if ( neighbourDepth != 0.0 ) {

									sum += max( 0.0, logDepth - neighbourDepth );

								}

							}

							return exp( - ( sum / 8.0 ) * 300.0 * uEdlStrength );

						}

					#endif

					// spread sequential ids into visually distinct colors
					vec3 idToColor( float id ) {

						return vec3(
							fract( sin( id * 12.9898 ) * 43758.5453 ),
							fract( sin( id * 78.2330 ) * 12543.2341 ),
							fract( sin( id * 3.7010 ) * 26445.3450 )
						);

					}
					`
				)
				.replace(
					'#include <color_fragment>',
					/* glsl */`
					#include <color_fragment>

					// color each point by a hash of the node it is sized by
					#ifdef DEBUG_NODE_COLORS

						diffuseColor.rgb = idToColor( vNodeId + 1.0 );

					#endif

					// color by the tile the point came from, showing how tiles overlap
					#ifdef DEBUG_TILE_COLORS

						diffuseColor.rgb = idToColor( uTileId + 1.0 );

					#endif

					// color each point by the depth of the node it is sized by, one hue per level
					#ifdef DEBUG_DEPTH_COLORS

						float hue = vDepth / 8.0;
						diffuseColor.rgb = clamp( abs( fract( hue + vec3( 0.0, 2.0 / 3.0, 1.0 / 3.0 ) ) * 6.0 - 3.0 ) - 1.0, 0.0, 1.0 );

					#endif
					`
				)
				.replace(
					'#include <colorspace_fragment>',
					/* glsl */`
					#include <colorspace_fragment>

					#ifdef EDL_ENABLED

						// shade after the color space conversion so the falloff lands on the
						// encoded color, as potree's post process does
						gl_FragColor.rgb *= edlShade( vLogDepth );

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

						// intersect the view ray with the point's sphere and write that depth so
						// overlapping points meet as solid spheres rather than flat discs
						vec3 rayDir = normalize( vViewPosition + vec3( pointOffset * vRadius, 0.0 ) );
						float rayDot = dot( vViewPosition, rayDir );
						float disc = rayDot * rayDot - dot( vViewPosition, vViewPosition ) + vRadius * vRadius;
						if ( disc < 0.0 ) discard;

						vec4 clipPos = projectionMatrix * vec4( rayDir * ( rayDot - sqrt( disc ) ), 1.0 );
						gl_FragDepth = ( clipPos.z / clipPos.w ) * 0.5 + 0.5;

					#endif

					#ifdef EDL_ENABLED

						// the pre-pass only needs the log depth, so return before the color work
						if ( uEdlDepthPass ) {

							gl_FragColor = vec4( vLogDepth, 0.0, 0.0, 1.0 );
							return;

						}

					#endif
					`
				);

		};

	}

	// Rebuild the shader feature defines for the current shape, debug and edl settings
	_updateDefines() {

		const defines = {};
		if ( this.uniforms.uEdlStrength.value > 0 ) defines.EDL_ENABLED = '';
		if ( this._pointShape === 'round' ) defines.ROUND_POINTS = '';
		if ( this._pointShape === 'sphere' ) defines.SPHERE_POINTS = '';
		if ( this._debugColorMode === 'node' ) defines.DEBUG_NODE_COLORS = '';
		if ( this._debugColorMode === 'depth' ) defines.DEBUG_DEPTH_COLORS = '';
		if ( this._debugColorMode === 'tile' ) defines.DEBUG_TILE_COLORS = '';

		this.defines = defines;
		this.needsUpdate = true;

	}

}
