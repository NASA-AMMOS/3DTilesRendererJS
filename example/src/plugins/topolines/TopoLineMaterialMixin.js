// Adjusts the provided material to support fading in and out using a bayer pattern. Providing a "previous"

import { Color, Matrix4, Vector2, Vector3 } from 'three';

// before compile can be used to chain shader adjustments. Returns the added uniforms used for fading.
export function wrapTopoLineMaterial( material, previousOnBeforeCompile ) {

	const params = {
		ellipsoid: { value: new Vector3() },
		frame: { value: new Matrix4() },

		topoLineColor: { value: new Color() },
		topoOpacity: { value: 0.5 },
		topoLimits: { value: new Vector2( 0, 1e10 ) },

		cartoLineColor: { value: new Color() },
		cartoOpacity: { value: 0.5 },
		cartoLimits: { value: new Vector2( 0, 1e10 ) },

	};

	material.version = 300;

	material.defines = {
		...( material.defines || {} ),
		USE_ELLIPSOID: 0,
		USE_TOPOLINES: 1,
		USE_CARTOLINES: 1,
	};

	material.customProgramCacheKey = () => {

		return Number( ! ! params.ellipsoid ) + '_' + JSON.stringify( material.defines );

	};

	material.onBeforeCompile = shader => {

		addWorldPosition( shader );

		if ( previousOnBeforeCompile ) {

			previousOnBeforeCompile( shader );

		}

		shader.uniforms = {
			...shader.uniforms,
			...params,
		};

		shader.fragmentShader = shader
			.fragmentShader
			.replace( /void main\(/, value => /* glsl */`

				uniform vec3 ellipsoid;
				uniform mat4 frame;

				uniform vec3 topoLineColor;
				uniform float topoOpacity;
				uniform vec2 topoLimits;

				uniform vec3 cartoLineColor;
				uniform float cartoOpacity;
				uniform vec2 cartoLimits;

				uniform mat4 projectionMatrix;

				float log10( float v ) {

					return log( v ) / log( 10.0 );

				}

				vec3 calculateTopoLines( vec3 value, vec3 delta, vec3 topoStep ) {

					vec3 halfTopoStep = topoStep * 0.5;
					vec3 lineIndex = mod( value, topoStep * 10.0 );
					lineIndex = abs( lineIndex );
					lineIndex = step( lineIndex, topoStep * 0.5 );

					// calculate the topography lines
					vec3 thickness = vec3(
						lineIndex.x == 0.0 ? 1.0 : 1.5,
						lineIndex.y == 0.0 ? 1.0 : 1.5,
						lineIndex.z == 0.0 ? 1.0 : 1.5
					);
					vec3 stride = 2.0 * abs( mod( value + halfTopoStep, topoStep ) - halfTopoStep );
					vec3 topo = smoothstep( delta * 0.5, delta * - 0.5, stride - delta * thickness );

					// handle steep surfaces that cover multiple bands
					vec3 subPixelColor = delta / topoStep;
					vec3 subPixelAlpha = smoothstep( 0.4 * topoStep, 0.5 * topoStep, delta );
					vec3 fadedTopo = mix( topo, topoStep / delta * 0.2, subPixelAlpha );

					return vec3(
						lineIndex.x == 0.0 ? 0.5 : 1.0,
						lineIndex.y == 0.0 ? 0.5 : 1.0,
						lineIndex.z == 0.0 ? 0.5 : 1.0
					) * fadedTopo;

				}

				float fwidth2( float v ) {

					float vdy = dFdy( v );
					float vdx = dFdx( v );
					return length( vec2( vdy, vdx ) );

				}

				vec3 fwidth2( vec3 v ) {

					vec3 vdy = dFdy( v );
					vec3 vdx = dFdx( v );
					return sqrt( vdy * vdy + vdx * vdx );

				}

				${ value }
			` )
			.replace( /#include <color_fragment>/, value => /* glsl */`

				${ value }
				{

					mat4 invFrame = inverse( frame );
					vec3 localPos = ( invFrame * vec4( wPosition, 1 ) ).xyz;

					// TODO: account for this at a pixel level if possible
					float distanceFromCamera = ( viewMatrix * vec4( wPosition, 1.0 ) ).z;
					vec4 p0 = projectionMatrix * vec4( 0, 0, distanceFromCamera, 1 );
					vec4 p1 = projectionMatrix * vec4( 0, 1.0, distanceFromCamera, 1 );
					float screenChange = 1.0 / distance( ( p0 / p1.w ).xyz, ( p1 / p1.w ).xyz );

					// calculate the transition boundary for this pixel
					// TODO: tune this - perhaps a different scaling mechanism is needed rather than log so
					// the distances align more as anticipated
					float topoBoundary = ( - 2.0 + 0.75 * log10( 0.25 * screenChange ) );
					float topoAlpha = smoothstep( 1.0, 0.5, mod( topoBoundary, 1.0 ) );

					// get the height value to use for topo lines
					vec3 pos;
					#if USE_ELLIPSOID

						// TODO: calculate height relative to surface
						// TODO: calculate carto lines

					#else

						pos = localPos;
						pos.xz *= 0.1;

					#endif

					// calculate the lines on each axis
					vec3 posDelta = max( fwidth2( pos ), 1e-7 );
					float topoStep = pow( 10.0, ceil( topoBoundary ) );

					// calculate the step for the narrow and thick lines, limiting the minimum stride
					vec3 step0 = max( vec3( cartoLimits.x, topoLimits.x, cartoLimits.x ), vec3( topoStep ) );
					vec3 step1 = max( vec3( cartoLimits.x, topoLimits.x, cartoLimits.x ), vec3( topoStep * 10.0 ) );

					// calculate the topo line value
					vec3 topo0 = calculateTopoLines( pos, posDelta, step0 );
					vec3 topo1 = calculateTopoLines( pos, posDelta, step1 );

					// limit the the max stride
					vec3 mult0 = vec3( step1.x > cartoLimits.y, step1.y > topoLimits.y, step1.z > cartoLimits.y );
					vec3 mult1 = vec3( step1.x > cartoLimits.y, step1.y > topoLimits.y, step1.z > cartoLimits.y );

					// blend the small and large topo lines
					vec3 topo = mix( topo1, topo0, topoAlpha );

					diffuseColor.rgb = vec3( topo.y * topoOpacity );

				}

			` );

	};

	return params;

}

function addWorldPosition( shader ) {

	if ( /varying\s+vec3\s+wPosition/.test( shader.vertexShader ) ) {

		return;

	}

	shader.vertexShader = /* glsl */`
			varying vec3 wPosition;
			${ shader.vertexShader }
		`
		.replace(
			/#include <project_vertex>/,
			v => /* glsl */`
				${ v }
				wPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
			`,
		);

	shader.fragmentShader = /* glsl */`
		varying vec3 wPosition;
		${ shader.fragmentShader }
	`;

	return shader;

}
