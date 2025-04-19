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

				uniform vec3 cartoLineColor;
				uniform float cartoOpacity;

				uniform mat4 projectionMatrix;

				float log10( float v ) {

					return log( v ) / log( 10.0 );

				}

				float calculateTopoLines( float value, float yPosDelta, float topoStep ) {

					float halfTopoStep = topoStep * 0.5;
					float lineIndex = mod( value, topoStep * 10.0 );
					lineIndex = abs( lineIndex );
					lineIndex = step( lineIndex, topoStep * 0.5 );

					// calculate the topography lines
					float thickness = lineIndex == 0.0 ? 1.0 : 1.5;
					float stride = 2.0 * abs( mod( value + halfTopoStep, topoStep ) - halfTopoStep );
					float topo = smoothstep( yPosDelta * 0.5, yPosDelta * - 0.5, stride - yPosDelta * thickness );

					// handle steep surfaces that cover multiple bands
					float subPixelColor = yPosDelta / topoStep;
					float subPixelAlpha = smoothstep( 0.4 * topoStep, 0.5 * topoStep, yPosDelta );
					float fadedTopo = mix( topo, topoStep / yPosDelta * 0.2, subPixelAlpha );

					return lineIndex == 0.0 ? 0.5 * fadedTopo : fadedTopo;

				}

				float fwidth2( float v ) {

					float vdy = dFdy( v );
					float vdx = dFdx( v );
					return length( vec2( vdy, vdx ) );

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

					// get the height value to use for topo lines
					float height;
					#if USE_ELLIPSOID

						// TODO: calculate height relative to surface

					#else

						height = localPos.y;

					#endif

					// get the change in y
					float yPosDelta = max( fwidth2( wPosition.y ), 1e-7 );

					// calculate the topography step for this pixel
					// TODO: tune this - perhaps a different scaling mechanism is needed rather than log so
					// the distances align more as anticipated
					float topoBoundary = ( - 2.0 + 0.75 * log10( 0.25 * screenChange ) );
					float topoAlpha = smoothstep( 1.0, 0.5, mod( topoBoundary, 1.0 ) );

					float topoStep = pow( 10.0, ceil( topoBoundary ) );
					float topo0 = calculateTopoLines( wPosition.y, yPosDelta, topoStep );
					float topo1 = calculateTopoLines( wPosition.y, yPosDelta, topoStep * 10.0 );
					float topo = mix( topo1, topo0, topoAlpha );
					diffuseColor.rgb = mix( diffuseColor.rgb, topoLineColor, topo * topoOpacity );

					vec3 pos;
					#if USE_ELLIPSOID

						// TODO: calculate carto lines

					#else

						pos = localPos;

					#endif

					pos.xz *= 0.1;
					{

						float xPosDelta = max( fwidth2( pos.x ), 1e-7 );
						float topoStep = pow( 10.0, ceil( topoBoundary ) );
						float topo0 = calculateTopoLines( pos.x, xPosDelta, topoStep );
						float topo1 = calculateTopoLines( pos.x, xPosDelta, topoStep * 10.0 );
						float topo = mix( topo1, topo0, topoAlpha );
						diffuseColor.rgb = mix( diffuseColor.rgb, topoLineColor, topo * cartoOpacity );

					}

					{

						float xPosDelta = max( fwidth2( pos.z ), 1e-7 );
						float topoStep = pow( 10.0, ceil( topoBoundary ) );
						float topo0 = calculateTopoLines( pos.z, xPosDelta, topoStep );
						float topo1 = calculateTopoLines( pos.z, xPosDelta, topoStep * 10.0 );
						float topo = mix( topo1, topo0, topoAlpha );
						diffuseColor.rgb = mix( diffuseColor.rgb, topoLineColor, topo * cartoOpacity );

					}
					// TODO: calculate 2d projection lines

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
