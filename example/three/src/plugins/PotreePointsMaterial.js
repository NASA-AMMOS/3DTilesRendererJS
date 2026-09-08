import { PointsMaterial, Vector3 } from 'three';

/**
 * Width of the active node hierarchy texture the material samples, matching potree.
 */
export const ACTIVE_NODES_TEXTURE_SIZE = 2048;

// Bias applied to the octant selection so points lying exactly on octant planes resolve to the
// same side in every node's frame - larger than float rounding jitter and smaller than a point
// quantization step at any level
const OCTANT_PLANE_BIAS = '0.00005';

// Vertex shader chunk performing potree's per point size lookup: starting from the point's own
// node, walk down the loaded node hierarchy texture through the octant containing the point,
// tracking the deepest node marked active along the way. The returned depth is the number of
// levels the deepest active node sits below the point's own node, so the points of a coarse
// node shrink to match wherever finer nodes are active on top of it. The structure is the
// loaded tree rather than the active set, so an inactive intermediate node does not hide the
// active nodes below it.
const ACTIVE_DEPTH_CHUNK = /* glsl */ `
	uniform sampler2D uActiveNodes;
	uniform float uVNStart;
	uniform float uNodeSize;
	uniform vec3 uNodeMinOffset;

	// number of set bits at or below the given bit index
	float numberOfOnes( float number, float index ) {

		float result = 0.0;
		for ( float i = 0.0; i < 8.0; i ++ ) {

			if ( i > index ) break;
			if ( mod( floor( number / pow( 2.0, i ) ), 2.0 ) != 0.0 ) result ++;

		}

		return result;

	}

	// returns the depth of the deepest active node below this one containing the point (x) and
	// that node's texel index (y)
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

			// Octant of the current node containing the point. Quantized points lie exactly on
			// the octant planes and every node frame rounds them differently, so a small bias
			// pushes them all to the same side.
			float nodeSize = uNodeSize / pow( 2.0, i );
			vec3 index3d = floor( ( posInNode - offset ) / nodeSize + 0.5 + ${ OCTANT_PLANE_BIAS } );
			float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;

			// stop when the octant holds no loaded child
			float mask = floor( value.r * 255.0 + 0.5 );
			if ( mod( floor( mask / pow( 2.0, index ) ), 2.0 ) == 0.0 ) {

				return deepest;

			}

			// advance to the child's texel: the parent's first child offset plus the number of
			// loaded siblings in lower octants
			iOffset +=
				floor( value.g * 255.0 + 0.5 ) * 256.0 +
				floor( value.b * 255.0 + 0.5 ) +
				numberOfOnes( mask, index - 1.0 );
			depth ++;
			offset += nodeSize * 0.5 * index3d;

		}

		return deepest;

	}
`;

/**
 * PointsMaterial that sizes each point by the deepest active node at its position, resolved in
 * the vertex shader by walking a texture encoding the loaded node hierarchy and per node active
 * states. The projected size is clamped the way potree does with its "minSize" so distant
 * points do not shrink below a pixel and drop out.
 *
 * The `size` property is interpreted in world units as the point spacing of the node's own
 * level, which the shader halves for every active level found below the node at each point's
 * position.
 *
 * Uniforms to assign after construction:
 * - `uActiveNodes`: the hierarchy texture, `ACTIVE_NODES_TEXTURE_SIZE` x 1 texels.
 * - `uVNStart`: the node's texel index in the hierarchy texture.
 * - `uNodeSize`: world size of the node's cube.
 * - `uNodeMinOffset`: offset from mesh-local vertex positions to node-local positions.
 *
 * @param {Object} [params] PointsMaterial parameters plus the properties below.
 * @param {('square'|'round'|'sphere')} [params.pointShape='round'] Shape of the point sprites.
 *   Squares tile the surface with no gaps, circles read as a continuous organic surface, and
 *   spheres additionally write bulged depth values so overlapping points intersect. The sphere
 *   depth writes disable early depth testing, which has a fill rate cost. Can be adjusted
 *   dynamically.
 * @param {number} [params.minPointSize=2] Smallest projected point size in pixels.
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
			this.needsUpdate = true;

		}

	}

	get minPointSize() {

		return this._minPointSize;

	}

	set minPointSize( value ) {

		if ( value !== this._minPointSize ) {

			this._minPointSize = value;
			this.needsUpdate = true;

		}

	}

	get debugNodeColors() {

		return this._debugNodeColors;

	}

	set debugNodeColors( value ) {

		if ( value !== this._debugNodeColors ) {

			this._debugNodeColors = value;
			this.needsUpdate = true;

		}

	}

	constructor( params = {} ) {

		const {
			pointShape = 'round',
			minPointSize = 2,
			debugNodeColors = false,
			...rest
		} = params;

		super( { sizeAttenuation: true, ...rest } );

		this._pointShape = pointShape;
		this._minPointSize = minPointSize;
		this._debugNodeColors = debugNodeColors;

		this.uniforms = {
			uActiveNodes: { value: null },
			uVNStart: { value: 0 },
			uNodeSize: { value: 1 },
			uNodeMinOffset: { value: new Vector3() },
		};

		this.onBeforeCompile = shader => {

			const { pointShape, minPointSize, debugNodeColors } = this;

			Object.assign( shader.uniforms, this.uniforms );

			shader.vertexShader = shader.vertexShader
				.replace(
					'uniform float size;',
					`uniform float size;
					varying vec3 vViewPosition;
					varying float vRadius;
					varying float vNodeIndex;
					${ ACTIVE_DEPTH_CHUNK }`
				)
				.replace(
					'#include <logdepthbuf_vertex>',
					`vec2 activeResult = getActiveDepth( position + uNodeMinOffset );
					float worldSize = size / pow( 2.0, activeResult.x );
					gl_PointSize = worldSize * ( scale / - mvPosition.z );
					gl_PointSize = max( gl_PointSize, ${ minPointSize.toFixed( 1 ) } );
					vViewPosition = mvPosition.xyz;
					vRadius = worldSize * 0.5;
					vNodeIndex = activeResult.y;
					#include <logdepthbuf_vertex>`
				);

			// color each point by a hash of the node it is sized by
			if ( debugNodeColors ) {

				shader.fragmentShader = shader.fragmentShader
					.replace(
						'uniform float opacity;',
						`uniform float opacity;
						varying float vNodeIndex;`
					)
					.replace(
						'#include <color_fragment>',
						`diffuseColor.rgb = vec3(
							fract( sin( vNodeIndex * 12.9898 ) * 43758.5453 ),
							fract( sin( vNodeIndex * 78.2330 ) * 12543.2341 ),
							fract( sin( vNodeIndex * 3.7010 ) * 26445.3450 )
						);`
					);

			}

			if ( pointShape !== 'square' ) {

				shader.fragmentShader = shader.fragmentShader
					.replace(
						'uniform float opacity;',
						`uniform float opacity;
						uniform mat4 projectionMatrix;
						varying vec3 vViewPosition;
						varying float vRadius;`
					)
					.replace(
						'#include <clipping_planes_fragment>',
						`#include <clipping_planes_fragment>
						vec2 pointOffset = gl_PointCoord * 2.0 - 1.0;
						float radiusSq = dot( pointOffset, pointOffset );
						if ( radiusSq > 1.0 ) discard;
						${ pointShape === 'sphere' ? `
						// project the view position bulged toward the camera by the sphere surface
						vec4 spherePos = vec4( vViewPosition, 1.0 );
						spherePos.z += sqrt( 1.0 - radiusSq ) * vRadius;
						spherePos = projectionMatrix * spherePos;
						gl_FragDepth = ( spherePos.z / spherePos.w ) * 0.5 + 0.5;
						` : '' }`
					);

			}

		};

		this.customProgramCacheKey = () => {

			return `potree_points_${ this._pointShape }_${ this._minPointSize }_${ this._debugNodeColors }`;

		};

	}

}
