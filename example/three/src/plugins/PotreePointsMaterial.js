import { PointsMaterial, Vector3 } from 'three';

/**
 * Width of the active node hierarchy texture the material samples, matching potree.
 */
export const ACTIVE_NODES_TEXTURE_SIZE = 2048;

// Bias applied to the octant selection so quantized points lying exactly on octant planes
// resolve to the same side in every node's frame
const OCTANT_PLANE_BIAS = 0.00005;

/**
 * PointsMaterial that sizes each point by the deepest active node at its position, resolved in
 * the vertex shader by walking a texture encoding the loaded node hierarchy and per node active
 * states. The `size` property is the world-space point spacing of the node's own level, halved
 * per active level found below the node.
 *
 * Uniforms to assign after construction:
 * - `uActiveNodes`: the hierarchy texture, `ACTIVE_NODES_TEXTURE_SIZE` x 1 texels.
 * - `uVNStart`: the node's texel index in the hierarchy texture.
 * - `uNodeSize`: world size of the node's cube.
 * - `uNodeMinOffset`: offset from mesh-local vertex positions to node-local positions.
 *
 * @param {Object} [params] PointsMaterial parameters plus the properties below.
 * @param {('square'|'round'|'sphere')} [params.pointShape='round'] Shape of the point sprites.
 *   Spheres additionally write bulged depth values so overlapping points intersect, which has a
 *   fill rate cost. Can be adjusted dynamically.
 * @param {number} [params.minPointSize=2] Smallest projected point size in pixels. Can be
 *   adjusted dynamically.
 * @param {boolean} [params.debugNodeColors=false] Color each point by a hash of the node it is
 *   sized by. Can be adjusted dynamically.
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

	get debugNodeColors() {

		return this._debugNodeColors;

	}

	set debugNodeColors( value ) {

		if ( value !== this._debugNodeColors ) {

			this._debugNodeColors = value;
			this._updateDefines();

		}

	}

	constructor( params = {} ) {

		const {
			pointShape = 'round',
			minPointSize = 2,
			debugNodeColors = false,
			...rest
		} = params;

		super( rest );

		this._pointShape = pointShape;
		this._debugNodeColors = debugNodeColors;

		this.defines = {};
		this.uniforms = {
			uActiveNodes: { value: null },
			uVNStart: { value: 0 },
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
						uniform float uVNStart;
						uniform float uNodeSize;
						uniform vec3 uNodeMinOffset;

						varying vec3 vViewPosition;
						varying float vRadius;
						varying float vNodeIndex;

						// number of set bits at or below the given bit index
						float numberOfOnes( float number, float index ) {

							float result = 0.0;
							for ( float i = 0.0; i < 8.0; i ++ ) {

								if ( i > index ) break;
								if ( mod( floor( number / pow( 2.0, i ) ), 2.0 ) != 0.0 ) result ++;

							}

							return result;

						}

						// Walks down the loaded node hierarchy texture through the octant containing
						// the point, returning the depth of the deepest node marked active along the
						// way (x) and that node's texel index (y). The structure is the loaded tree
						// rather than the active set so an inactive intermediate node does not hide
						// the active nodes below it. Adapted from "getLOD" in potree's pointcloud.vs.
						vec2 getActiveDepth( vec3 posInNode ) {

							vec3 offset = vec3( 0.0 );
							float iOffset = uVNStart;
							float depth = 0.0;
							vec2 deepest = vec2( 0.0, uVNStart );
							for ( float i = 0.0; i < 20.0; i ++ ) {

								// track the deepest node marked active along the path
								vec4 value = texture2D( uActiveNodes, vec2( ( iOffset + 0.5 ) / ${ ACTIVE_NODES_TEXTURE_SIZE.toFixed( 1 ) }, 0.5 ) );
								if ( value.a > 0.5 ) {

									deepest = vec2( depth, iOffset );

								}

								// octant of the current node containing the point
								float nodeSize = uNodeSize / pow( 2.0, i );
								vec3 index3d = floor( ( posInNode - offset ) / nodeSize + 0.5 + ${ OCTANT_PLANE_BIAS } );
								float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;

								// stop when the octant holds no loaded child
								float mask = floor( value.r * 255.0 + 0.5 );
								if ( mod( floor( mask / pow( 2.0, index ) ), 2.0 ) == 0.0 ) {

									return deepest;

								}

								// advance to the child's texel: the parent's first child offset plus
								// the number of loaded siblings in lower octants
								iOffset +=
									floor( value.g * 255.0 + 0.5 ) * 256.0 +
									floor( value.b * 255.0 + 0.5 ) +
									numberOfOnes( mask, index - 1.0 );
								depth ++;
								offset += nodeSize * 0.5 * index3d;

							}

							return deepest;

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

						vViewPosition = mvPosition.xyz;
						vRadius = worldSize * 0.5;
						vNodeIndex = activeResult.y;

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
					`
				)
				.replace(
					'#include <color_fragment>',
					/* glsl */`
					#include <color_fragment>

					// color each point by a hash of the node it is sized by
					#ifdef DEBUG_NODE_COLORS

						diffuseColor.rgb = vec3(
							fract( sin( vNodeIndex * 12.9898 ) * 43758.5453 ),
							fract( sin( vNodeIndex * 78.2330 ) * 12543.2341 ),
							fract( sin( vNodeIndex * 3.7010 ) * 26445.3450 )
						);

					#endif
					`
				)
				.replace(
					'#include <clipping_planes_fragment>',
					/* glsl */`
					#include <clipping_planes_fragment>

					#ifdef ROUND_POINTS

						// discard the sprite corners so points draw as circles
						vec2 pointOffset = gl_PointCoord * 2.0 - 1.0;
						float radiusSq = dot( pointOffset, pointOffset );
						if ( radiusSq > 1.0 ) discard;

					#endif

					#ifdef SPHERE_POINTS

						// project the view position bulged toward the camera by the sphere surface
						vec4 spherePos = vec4( vViewPosition, 1.0 );
						spherePos.z += sqrt( 1.0 - radiusSq ) * vRadius;
						spherePos = projectionMatrix * spherePos;
						gl_FragDepth = ( spherePos.z / spherePos.w ) * 0.5 + 0.5;

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

		if ( this._pointShape !== 'square' ) defines.ROUND_POINTS = '';
		if ( this._pointShape === 'sphere' ) defines.SPHERE_POINTS = '';
		if ( this._debugNodeColors ) defines.DEBUG_NODE_COLORS = '';

		this.needsUpdate = true;

	}

}
