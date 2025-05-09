import{V as l,C as u,k as w,l as p,i as n,g as j}from"./three.module-Cdr6prlM.js";const q=`

	vec3 getPositionToSurfacePoint( vec3 radius, vec3 pos ) {

		float EPSILON12 = 1e-12;
		float CENTER_EPS = 0.1;

		// From Cesium function Ellipsoid.scaleToGeodeticSurface
		// https://github.com/CesiumGS/cesium/blob/d11b746e5809ac115fcff65b7b0c6bdfe81dcf1c/packages/engine/Source/Core/scaleToGeodeticSurface.js#L25
		vec3 invRadiusSq = 1.0 / pow( radius, vec3( 2.0 ) );
		vec3 pos2 = pos * pos * invRadiusSq;

		// Compute the squared ellipsoid norm.
		float squaredNorm = pos2.x + pos2.y + pos2.z;
		float ratio = sqrt( 1.0 / squaredNorm );

		// As an initial approximation, assume that the radial intersection is the projection point.
		vec3 intersection = pos * ratio;
		if ( squaredNorm < CENTER_EPS ) {

			return ratio > EPSILON12 ? vec3( 0.0 ) : intersection;

		}

		// Use the gradient at the intersection point in place of the true unit normal.
		// The difference in magnitude will be absorbed in the multiplier.
		vec3 gradient = intersection * invRadiusSq * 2.0;

		// Compute the initial guess at the normal vector multiplier, lambda.
		float lambda = ( 1.0 - ratio ) * length( pos ) / ( 0.5 * length( gradient ) );
		float correction = 0.0;

		float func, denominator;
		float xMultiplier, yMultiplier, zMultiplier;
		float xMultiplier2, yMultiplier2, zMultiplier2;
		float xMultiplier3, yMultiplier3, zMultiplier3;

		for ( int i = 0; i < 2; i ++ ) {

			lambda -= correction;

			xMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSq.x );
			yMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSq.y );
			zMultiplier = 1.0 / ( 1.0 + lambda * invRadiusSq.z );

			xMultiplier2 = xMultiplier * xMultiplier;
			yMultiplier2 = yMultiplier * yMultiplier;
			zMultiplier2 = zMultiplier * zMultiplier;

			xMultiplier3 = xMultiplier2 * xMultiplier;
			yMultiplier3 = yMultiplier2 * yMultiplier;
			zMultiplier3 = zMultiplier2 * zMultiplier;

			func = pos2.x * xMultiplier2 + pos2.y * yMultiplier2 + pos2.z * zMultiplier2 - 1.0;

			// "denominator" here refers to the use of this expression in the velocity and acceleration
			// computations in the sections to follow.
			denominator =
				pos2.x * xMultiplier3 * invRadiusSq.x +
				pos2.y * yMultiplier3 * invRadiusSq.y +
				pos2.z * zMultiplier3 * invRadiusSq.z;

			float derivative = - 2.0 * denominator;
			correction = func / derivative;

		}

		return vec3(
			pos.x * xMultiplier,
			pos.y * yMultiplier,
			pos.z * zMultiplier
		);

	}

	vec3 getPositionToNormal( vec3 radius, vec3 pos ) {

		vec3 radius2 = pow( radius, vec3( 2.0 ) );
		return normalize( pos / radius2 );

	}
`,Z=`
	float log10( float v ) {

		return log( v ) / log( 10.0 );

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
`;function $(r,i){const a={resolution:{value:new l},pixelRatio:{value:1},ellipsoid:{value:new p},frame:{value:new w},topoColor:{value:new u},topoOpacity:{value:.5},topoLimit:{value:new l(0,1e10)},topoFadeLimit:{value:new l(0,1e10)},cartoColor:{value:new u},cartoOpacity:{value:.5},cartoLimit:{value:new l(0,1e10)},cartoFadeLimit:{value:new l(0,1e10)},thickness:{value:1}};return r.defines={...r.defines||{},USE_TOPO_ELLIPSOID:0,USE_TOPO_LINES:1},r.onBeforeCompile=e=>{G(e),i&&i(e),e.uniforms={...e.uniforms,...a},e.vertexShader=e.vertexShader.replace(/void main\(/,t=>`

				${q}

				#if USE_TOPO_ELLIPSOID && USE_TOPO_LINES

					uniform vec3 ellipsoid;
					uniform mat4 frame;
					varying vec4 vCartographic;

				#endif

				${t}

			`).replace(/wPosition[^\n]+;/,t=>`

				${t}

				#if USE_TOPO_ELLIPSOID && USE_TOPO_LINES
				{

					mat4 invFrame = inverse( frame );
					vec3 localPosition = ( invFrame * vec4( wPosition, 1 ) ).xyz;

					// From Cesium function Ellipsoid.cartesianToCartographic
					// https://github.com/CesiumGS/cesium/blob/665ec32e813d5d6fe906ec3e87187f6c38ed5e49/packages/engine/Source/Core/Ellipsoid.js#L463
					vec3 surfacePoint = getPositionToSurfacePoint( ellipsoid, localPosition );
					vec3 surfaceNormal = getPositionToNormal( ellipsoid, localPosition );
					vec3 heightDelta = localPosition - surfacePoint;
					float height = sign( dot( heightDelta, localPosition ) ) * length( heightDelta );

					vCartographic.xyz = surfaceNormal;
					vCartographic.w = height;

				}
				#endif

			`),e.fragmentShader=e.fragmentShader.replace(/void main\(/,t=>`

				#if USE_TOPO_ELLIPSOID && USE_TOPO_LINES

					uniform vec3 ellipsoid;
					varying vec4 vCartographic;

				#endif

				#if USE_TOPO_LINES

					uniform vec2 resolution;
					uniform float pixelRatio;

					uniform mat4 frame;
					uniform float thickness;

					uniform vec3 topoColor;
					uniform float topoOpacity;
					uniform vec2 topoLimit;
					uniform vec2 topoFadeLimit;

					uniform vec3 cartoColor;
					uniform float cartoOpacity;
					uniform vec2 cartoLimit;
					uniform vec2 cartoFadeLimit;

					uniform mat4 projectionMatrix;

					${Z}

				#endif

				vec3 calculateTopoLines( vec3 value, vec3 delta, vec3 topoStep, vec2 thickness, vec3 emphasisStride ) {

					vec3 halfTopoStep = topoStep * 0.5;
					vec3 lineIndex = mod( value, topoStep * emphasisStride );
					lineIndex = abs( lineIndex );
					lineIndex = step( lineIndex, topoStep * 0.5 );

					// calculate the topography lines
					// TODO: validate that these thresholds are being used correctly
					vec3 topoThickness = vec3(
						lineIndex.x == 0.0 ? thickness[ 0 ] : thickness[ 1 ],
						lineIndex.y == 0.0 ? thickness[ 0 ] : thickness[ 1 ],
						lineIndex.z == 0.0 ? thickness[ 0 ] : thickness[ 1 ]
					);
					vec3 stride = 2.0 * abs( mod( value + halfTopoStep, topoStep ) - halfTopoStep );
					vec3 topo = smoothstep( delta * 0.5, delta * - 0.5, stride - delta * topoThickness );

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

				${t}
			`).replace(/#include <color_fragment>/,t=>`

				${t}

				#if USE_TOPO_LINES
				{

					float FADE_SIZE = 0.25;
					float FADE_SIZE_HALF = FADE_SIZE * 0.5;
					float targetPixelsPerStep = pixelRatio * 1.75;

					// calculate projected screen points
					float distanceFromCamera = ( viewMatrix * vec4( wPosition, 1.0 ) ).z;
					vec4 p0 = projectionMatrix * vec4( 0, 0, distanceFromCamera, 1 );
					vec4 p1 = projectionMatrix * vec4( 1.0, 1.0, distanceFromCamera, 1 );

					// amount of pixel change per meter in screen space
					// multiple by 0.5 since the NDC value range is between [-1, 1]
					vec2 clipSpaceDelta = 0.5 * ( ( p1 / p1.w ).xy - ( p0 / p0.w ).xy );
					vec2 pixelDelta = abs( clipSpaceDelta * resolution );

					// amount of meter change per pixel
					float pixelsPerMeter = max( pixelDelta.x, pixelDelta.y );
					float metersPerPixel = 1.0 / pixelsPerMeter;
					float targetMeters = targetPixelsPerStep * metersPerPixel;

					// calculate the nearest power of 10 that the meters
					float nearestPow10 = log10( targetMeters );
					float topoAlpha = smoothstep( 1.0, 1.0 - FADE_SIZE, mod( nearestPow10, 1.0 ) );
					float topoStep = pow( 10.0, ceil( nearestPow10 ) );

					// get the height value to use for topo lines
					vec3 pos;
					#if USE_TOPO_ELLIPSOID

						vec3 surfaceNormal = vCartographic.xyz;
						pos.x = atan( surfaceNormal.y, surfaceNormal.x );
						pos.y = asin( surfaceNormal.z );
						pos.z = vCartographic.w;

						pos.xy *= 180.0 / PI;
						pos.x += 180.0;
						pos.xy *= 1000.0;

					#else

						mat4 invFrame = inverse( frame );
						vec3 localPosition = ( invFrame * vec4( wPosition, 1 ) ).xyz;
						pos = vec3( localPosition.xy * 0.1, localPosition.z );

					#endif

					// calculate the step for the narrow and thick lines, limiting the minimum stride
					vec3 step0 = max( vec3( cartoLimit.xx, topoLimit.x ), vec3( topoStep ) );
					step0 = min( vec3( cartoLimit.yy, topoLimit.y ), step0 );

					vec3 step1 = max( vec3( cartoLimit.xx, topoLimit.x ), vec3( topoStep * 10.0 ) );
					step1 = min( vec3( cartoLimit.yy, topoLimit.y ), step1 );

					// thickness and emphasis of lines
					vec2 thickness0 = vec2( 1.0, 2.0 );
					vec2 thickness1 = vec2( 1.0, 2.0 );
					vec3 emphasisStride0 = vec3( 10.0 );
					vec3 emphasisStride1 = vec3( 10.0 );
					#if USE_TOPO_ELLIPSOID

						// If our stride is at the root level then adjust the lines and emphasis so it
						// lies on the quadrant axes
						if ( step0.x > 1e4 ) {

							thickness0 = vec2( 2.0 );
							step0.x = 90.0 * 1000.0;

						}

						if ( step0.x > 1e3 ) {

							emphasisStride0.x = 9.0;

						}

						if ( step1.x > 1e4 ) {

							thickness1 = vec2( 2.0 );
							step1.x = 90.0 * 1000.0;

						}

						if ( step1.x > 1e3 ) {

							emphasisStride1.x = 9.0;

						}

					#endif

					thickness0 *= thickness * pixelRatio;
					thickness1 *= thickness * pixelRatio;

					// calculate the topo line value
					vec3 posDelta = max( fwidth2( pos ), 1e-7 );
					vec3 topo0 = calculateTopoLines( pos, posDelta, step0, thickness0, emphasisStride0 );
					vec3 topo1 = calculateTopoLines( pos, posDelta, step1, thickness1, emphasisStride1 );

					// calculate the point to fade out the topographic lines based on the unclamped step
					vec3 maxFadeLimit = vec3( cartoFadeLimit.yy, topoFadeLimit.y );
					vec3 minFadeLimit = vec3( cartoFadeLimit.xx, topoFadeLimit.x );
					vec3 maxFadeLimitAlpha = 1.0 - smoothstep( maxFadeLimit * ( 1.0 - FADE_SIZE_HALF ), maxFadeLimit * ( 1.0 + FADE_SIZE_HALF ), vec3( pow( 10.0, nearestPow10 + 1.0 ) ) );
					vec3 minFadeLimitAlpha = smoothstep( minFadeLimit * ( 1.0 - FADE_SIZE_HALF ), minFadeLimit * ( 1.0 + FADE_SIZE_HALF ), vec3( pow( 10.0, nearestPow10 + 1.0 ) ) );

					// blend the small and large topo lines
					vec3 topo = mix( topo1, topo0, topoAlpha ) * maxFadeLimitAlpha * minFadeLimitAlpha;

					// blend with the base color
					diffuseColor.rgb = mix( diffuseColor.rgb, cartoColor, max( topo.x * cartoOpacity, topo.y * cartoOpacity ) );
					diffuseColor.rgb = mix( diffuseColor.rgb, topoColor, topo.z * topoOpacity );

				}
				#endif

			`)},a}function G(r){if(!/varying\s+vec3\s+wPosition/.test(r.vertexShader))return r.vertexShader=`
			varying vec3 wPosition;
			${r.vertexShader}
		`.replace(/#include <project_vertex>/,i=>`
				${i}
				wPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
			`),r.fragmentShader=`
		varying vec3 wPosition;
		${r.fragmentShader}
	`,r}const H=new p,V=new l,s=new p,S=new p,T=new p,W=new p,B=new p,J=new w,K=new w,d=new p,h=new p;class Q extends j{constructor(){super()}dispose(){this.removeFromParent(),this.material.dispose(),this.geometry.dispose()}}class Y{get resolution(){return this._resolution}get topoOpacity(){return this.topoOpacityUniform.value}set topoOpacity(i){this.topoOpacityUniform.value!==i&&(this.topoOpacityUniform.value=i,this.updateDefines())}get cartoOpacity(){return this.cartoOpacityUniform.value}set cartoOpacity(i){this.cartoOpacityUniform.value!==i&&(this.cartoOpacityUniform.value=i,this.updateDefines())}get projection(){return this._projection}set projection(i){i!==this._projection&&(this._projection=i,this.updateDefines())}get thickness(){return this.thicknessUniform.value}set thickness(i){this.thicknessUniform.value=i}constructor(i={}){const a="projection"in i?i.projection==="planar":!0,{projection:e="planar",thickness:t=1,topoColor:o=new u(16777215),topoOpacity:c=.5,topoLimit:v=a?new l(.1,1e10):new l(1,1e10),topoFadeLimit:L=a?new l(0,1e10):new l(0,1e4),cartoColor:P=new u(16777215),cartoOpacity:_=a?0:.5,cartoLimit:f=new l(.1,1e10),cartoFadeLimit:O=a?new l(0,1e10):new l(1.5*1e4,1e6)}=i;this.name="TOPO_LINES_PLUGIN",this.tiles=null,this.thicknessUniform={value:t},this.topoColor=new u().set(o),this.topoOpacityUniform={value:c},this.topoLimit=new l(...v),this.topoFadeLimit=new l(...L),this.cartoColor=new u().set(P),this.cartoOpacityUniform={value:_},this.cartoLimit=new l(...f),this.cartoFadeLimit=new l(...O),this._projection=e,this._pixelRatioUniform={value:1},this._resolution=new l(1,1),this._resolutionSampleObject=null}computeTopographicLineInfo(i,a,e={}){e.alpha=0,e.value=0,e.fade=0,e.emphasisStride=0,e.min=e.min||{step:0,stepInPixels:0},e.max=e.max||{step:0,stepInPixels:0};const{cartoLimit:t,cartoFadeLimit:o,topoLimit:c,topoFadeLimit:v}=this,L=this._pixelRatioUniform.value,P=this._resolution,_=this._projection,f=J.copy(this.tiles.group.matrixWorld).invert(),O=K.copy(i.matrixWorld).invert(),E=.25,x=E*.5,b=L*1.75,g=H.copy(a).applyMatrix4(O).z,C=W.set(0,0,g).applyMatrix4(i.projectionMatrix),U=B.set(1,1,g).applyMatrix4(i.projectionMatrix),F=V.subVectors(U,C).multiply(P).multiplyScalar(.5),M=Math.max(Math.abs(F.x),Math.abs(F.y)),D=1/M,z=b*D,y=Math.log10(z),k=1-n.smoothstep(1-Math.abs(y%1),1-E,1),m=Math.pow(10,Math.ceil(y));if(_==="ellipsoid"){s.copy(a).applyMatrix4(f);const I=this.tiles.ellipsoid;I.getPositionToSurfacePoint(s,T),I.getPositionToNormal(s,S);const R=s.distanceTo(T);s.x=Math.atan(S.y,S.x),s.y=Math.asin(S.z),s.z=R,s.x=s.x*n.RAD2DEG,s.y=s.x*n.RAD2DEG,s.x+=180,s.x*=1e3,s.y*=1e3}else s.copy(a).applyMatrix4(f),s.x*=.1,s.y*=.1;d.x=n.clamp(m,t.x,t.y),d.y=n.clamp(m,t.x,t.y),d.z=n.clamp(m,c.x,c.y),h.x=n.clamp(m*10,t.x,t.y),h.y=n.clamp(m*10,t.x,t.y),h.z=n.clamp(m*10,c.x,c.y);const N=1-n.smoothstep(v.y*(1-x),v.y*(1+x),Math.pow(10,y+1)),A=n.smoothstep(o.y*(1-x),o.y*(1+x),Math.pow(10,y+1));return e.alpha=k,e.fade=N*A,e.value=s.z,e.min.step=d.z,e.min.stepInPixels=d.z*M,e.max.step=h.z,e.max.stepInPixels=h.z*M,e}init(i){this.tiles=i,this._loadModelCallback=({scene:e})=>{e.traverse(t=>{if(t.material){const o=$(t.material,t.material.onBeforeCompile);o.ellipsoid.value=i.ellipsoid.radius,o.frame.value=i.group.matrixWorld,o.thickness=this.thicknessUniform,o.topoColor.value=this.topoColor,o.topoOpacity=this.topoOpacityUniform,o.topoLimit.value=this.topoLimit,o.topoFadeLimit.value=this.topoFadeLimit,o.cartoColor.value=this.cartoColor,o.cartoOpacity=this.cartoOpacityUniform,o.cartoLimit.value=this.cartoLimit,o.cartoFadeLimit.value=this.cartoFadeLimit,o.resolution.value=this._resolution,o.pixelRatio=this._pixelRatioUniform,t.material.defines.USE_TOPO_ELLIPSOID=+(this.projection==="ellipsoid"),t.material.needsUpdate=!0}})},i.addEventListener("load-model",this._loadModelCallback);const a=new Q;a.frustumCulled=!1,a.onBeforeRender=e=>{const t=e.getRenderTarget();t?(this._resolution.width=t.width,this._resolution.height=t.height,this._pixelRatioUniform.value=1):(e.getDrawingBufferSize(this._resolution),this._pixelRatioUniform.value=e.getPixelRatio())},i.group.add(a),this._resolutionSampleObject=a}updateDefines(){const i=+(this.projection==="ellipsoid"),a=+!!(this.topoOpacity+this.cartoOpacity);this.tiles.forEachLoadedModel(e=>{e.traverse(t=>{if(t.material){const{defines:o}=t.material;o.USE_TOPO_ELLIPSOID!==i&&(o.USE_TOPO_ELLIPSOID=i,t.material.needsUpdate=!0),o.USE_TOPO_LINES!==a&&(o.USE_TOPO_LINES=a,t.material.needsUpdate=!0)}})})}dispose(){this.cartoOpacity=0,this.topoOpacity=0,this.tiles.removeEventListener("load-model",this._loadModelCallback),this.updateDefines(),this._resolutionSampleObject.dispose()}}export{Y as T};
