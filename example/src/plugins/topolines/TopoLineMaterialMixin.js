// Adjusts the provided material to support fading in and out using a bayer pattern. Providing a "previous"

import { Color, Matrix4, Vector3 } from 'three';

// before compile can be used to chain shader adjustments. Returns the added uniforms used for fading.
export function wrapTopoLineMaterial( material, previousOnBeforeCompile ) {

	const params = {
		ellipsoid: { value: new Vector3() },
		frame: { value: new Matrix4() },

		topoLineColor: { value: new Color() },
		cartoLineColor: { value: new Color() },
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
				uniform vec3 cartoLineColor;

				float log10( float v ) {

					return log( v ) / log( 10.0 );

				}

				${ value }
			` )
			.replace( /#include <color_fragment>/, value => /* glsl */`

				${ value }
				{

					mat4 invFrame = inverse( frame );
					vec3 localPos = ( invFrame * vec4( wPosition, 1 ) ).xyz;

					float height;
					#if USE_ELLIPSOID

						// TODO: calculate height relative to surface

					#else

						height = localPos.y;

					#endif

					// get the change in y
					float ydy = dFdy( wPosition.y );
					float ydx = dFdx( wPosition.y );
					float yPosDelta = max( sqrt( ydy * ydy + ydx * ydx ), 1e-7 );

					// TODO: it may be best to compute the topo step based on the distance to the camera
					// at the given pixel rather than relying on the per-pixel distances
					// Maybe we can use the overall wPosition change in screen space?

					// calculate the topography step for this pixel
					float topoPow = - 1.0;//ceil( 1.0 + log10( 10.0 * abs( yPosDelta ) ) );
					float topoStep = pow( 10.0, topoPow );
					float halfTopoStep = topoStep * 0.5;

					float lineIndex = mod( wPosition.y, topoStep * 10.0 );
					lineIndex -= topoStep;
					lineIndex = abs( lineIndex );
					lineIndex = step( lineIndex, topoStep * 0.5 );

					// calculate the topography lines
					float thickness = lineIndex == 0.0 ? 2.0 : 4.0;
					float stride = 2.0 * abs( mod( wPosition.y + halfTopoStep, topoStep ) - halfTopoStep );
					float topo = smoothstep( yPosDelta * thickness, 0.0, stride );

					// handle steep surfaces that cover multiple bands
					float subPixelColor = yPosDelta / topoStep;
					float subPixelAlpha = smoothstep( 0.3 * topoStep, 0.4 * topoStep, yPosDelta );
					float fadedTopo = mix( topo, topoStep / yPosDelta * 0.2, subPixelAlpha );

					diffuseColor.rgb = mix( diffuseColor.rgb, topoLineColor, fadedTopo );
					// diffuseColor.rgb = vec3( fadedTopo, 0, 0 );
					// diffuseColor.rgb = vec3( sqrt( topoStep ), 0, 0 );
					// diffuseColor.rgb = vec3( subPixelAlpha, 0, 0 );

					#if USE_ELLIPSOID

						// TODO: calculate carto lines

					#else

						// TODO: calculate xyz line

					#endif

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