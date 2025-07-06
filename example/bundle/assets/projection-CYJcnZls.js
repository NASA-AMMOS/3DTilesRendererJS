import{b2 as tn,aw as ct,b3 as Xe,a_ as he,b4 as nn,B as be,d as It,l as u,b as on,U as lt,b5 as ut,V as et,g as rn,r as ge,b6 as sn,k as B,i as Ut,aM as We,a as Wt,O as Tt,C as an,Q as tt,as as Bt,ad as jt,b7 as cn}from"./three.module-CzWreCHW.js";import{r as n,u as re,c as Ft,a as nt,j as K,b as kt,h as ln,d as un,C as dn,T as fn,E as pn}from"./CameraControls-Bj2iKstu.js";import{I as mn,C as hn}from"./ImageOverlayPlugin-BTVweoDk.js";import{T as gn}from"./TilesFadePlugin-Bx-MNkl9.js";import{_ as Ie}from"./extends-CF3RwP-h.js";import{v as Ht}from"./constants-BCLHrmCX.js";import"./EnvironmentControls-Cha4185v.js";import"./GlobeControls-iJmAxXHM.js";import"./Ellipsoid-LzblhFqo.js";import"./I3DMLoader-42kOJGqa.js";import"./readMagicBytes-ReGFEf36.js";import"./GLTFLoader-CsAsWpCl.js";import"./TilesRenderer-Bj3jFqhy.js";import"./B3DMLoader-BMIvdSjv.js";import"./PNTSLoader-D9V4HNXp.js";import"./CMPTLoader-7gzjihXL.js";import"./EllipsoidRegion-CdKyati1.js";import"./TMSImageSource-B9ZUSnk7.js";import"./TiledImageSource-C-or74PN.js";import"./CesiumIonAuth-Bynk6iB2.js";const Nt=Ht>=125?"uv1":"uv2",dt=new be,Pe=new u;class ot extends tn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],r=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(r),this.setAttribute("position",new ct(e,3)),this.setAttribute("uv",new ct(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,r=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),r.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const r=new Xe(t,6,1);return this.setAttribute("instanceStart",new he(r,3,0)),this.setAttribute("instanceEnd",new he(r,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));const o=new Xe(r,t*2,1);return this.setAttribute("instanceColorStart",new he(o,t,0)),this.setAttribute("instanceColorEnd",new he(o,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new nn(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new be);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),dt.setFromBufferAttribute(t),this.boundingBox.union(dt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new It),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const r=this.boundingSphere.center;this.boundingBox.getCenter(r);let o=0;for(let s=0,c=e.count;s<c;s++)Pe.fromBufferAttribute(e,s),o=Math.max(o,r.distanceToSquared(Pe)),Pe.fromBufferAttribute(t,s),o=Math.max(o,r.distanceToSquared(Pe));this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}class $t extends ot{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const t=e.length-3,r=new Float32Array(2*t);for(let o=0;o<t;o+=3)r[2*o]=e[o],r[2*o+1]=e[o+1],r[2*o+2]=e[o+2],r[2*o+3]=e[o+3],r[2*o+4]=e[o+4],r[2*o+5]=e[o+5];return super.setPositions(r),this}setColors(e,t=3){const r=e.length-t,o=new Float32Array(2*r);if(t===3)for(let s=0;s<r;s+=t)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5];else for(let s=0;s<r;s+=t)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5],o[2*s+6]=e[s+6],o[2*s+7]=e[s+7];return super.setColors(o,t),this}fromLine(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class rt extends on{constructor(e){super({type:"LineMaterial",uniforms:lt.clone(lt.merge([ut.common,ut.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new et(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${Ht>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(t){t===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(t){!!t!="USE_DASH"in this.defines&&(this.needsUpdate=!0),t===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}const je=new ge,ft=new u,pt=new u,G=new ge,q=new ge,ee=new ge,Fe=new u,ke=new B,J=new sn,mt=new u,Ce=new be,_e=new It,te=new ge;let ne,le;function ht(i,e,t){return te.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),te.multiplyScalar(1/te.w),te.x=le/t.width,te.y=le/t.height,te.applyMatrix4(i.projectionMatrixInverse),te.multiplyScalar(1/te.w),Math.abs(Math.max(te.x,te.y))}function yn(i,e){const t=i.matrixWorld,r=i.geometry,o=r.attributes.instanceStart,s=r.attributes.instanceEnd,c=Math.min(r.instanceCount,o.count);for(let l=0,m=c;l<m;l++){J.start.fromBufferAttribute(o,l),J.end.fromBufferAttribute(s,l),J.applyMatrix4(t);const w=new u,g=new u;ne.distanceSqToSegment(J.start,J.end,g,w),g.distanceTo(w)<le*.5&&e.push({point:g,pointOnLine:w,distance:ne.origin.distanceTo(g),object:i,face:null,faceIndex:l,uv:null,[Nt]:null})}}function vn(i,e,t){const r=e.projectionMatrix,s=i.material.resolution,c=i.matrixWorld,l=i.geometry,m=l.attributes.instanceStart,w=l.attributes.instanceEnd,g=Math.min(l.instanceCount,m.count),a=-e.near;ne.at(1,ee),ee.w=1,ee.applyMatrix4(e.matrixWorldInverse),ee.applyMatrix4(r),ee.multiplyScalar(1/ee.w),ee.x*=s.x/2,ee.y*=s.y/2,ee.z=0,Fe.copy(ee),ke.multiplyMatrices(e.matrixWorldInverse,c);for(let _=0,j=g;_<j;_++){if(G.fromBufferAttribute(m,_),q.fromBufferAttribute(w,_),G.w=1,q.w=1,G.applyMatrix4(ke),q.applyMatrix4(ke),G.z>a&&q.z>a)continue;if(G.z>a){const p=G.z-q.z,v=(G.z-a)/p;G.lerp(q,v)}else if(q.z>a){const p=q.z-G.z,v=(q.z-a)/p;q.lerp(G,v)}G.applyMatrix4(r),q.applyMatrix4(r),G.multiplyScalar(1/G.w),q.multiplyScalar(1/q.w),G.x*=s.x/2,G.y*=s.y/2,q.x*=s.x/2,q.y*=s.y/2,J.start.copy(G),J.start.z=0,J.end.copy(q),J.end.z=0;const I=J.closestPointToPointParameter(Fe,!0);J.at(I,mt);const W=Ut.lerp(G.z,q.z,I),b=W>=-1&&W<=1,S=Fe.distanceTo(mt)<le*.5;if(b&&S){J.start.fromBufferAttribute(m,_),J.end.fromBufferAttribute(w,_),J.start.applyMatrix4(c),J.end.applyMatrix4(c);const p=new u,v=new u;ne.distanceSqToSegment(J.start,J.end,v,p),t.push({point:v,pointOnLine:p,distance:ne.origin.distanceTo(v),object:i,face:null,faceIndex:_,uv:null,[Nt]:null})}}}class Vt extends rn{constructor(e=new ot,t=new rt({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,r=e.attributes.instanceEnd,o=new Float32Array(2*t.count);for(let c=0,l=0,m=t.count;c<m;c++,l+=2)ft.fromBufferAttribute(t,c),pt.fromBufferAttribute(r,c),o[l]=l===0?0:o[l-1],o[l+1]=o[l]+ft.distanceTo(pt);const s=new Xe(o,2,1);return e.setAttribute("instanceDistanceStart",new he(s,1,0)),e.setAttribute("instanceDistanceEnd",new he(s,1,1)),this}raycast(e,t){const r=this.material.worldUnits,o=e.camera;o===null&&!r&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;ne=e.ray;const c=this.matrixWorld,l=this.geometry,m=this.material;le=m.linewidth+s,l.boundingSphere===null&&l.computeBoundingSphere(),_e.copy(l.boundingSphere).applyMatrix4(c);let w;if(r)w=le*.5;else{const a=Math.max(o.near,_e.distanceToPoint(ne.origin));w=ht(o,a,m.resolution)}if(_e.radius+=w,ne.intersectsSphere(_e)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),Ce.copy(l.boundingBox).applyMatrix4(c);let g;if(r)g=le*.5;else{const a=Math.max(o.near,Ce.distanceToPoint(ne.origin));g=ht(o,a,m.resolution)}Ce.expandByScalar(g),ne.intersectsBox(Ce)!==!1&&(r?yn(this,t):vn(this,o,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(je),this.material.uniforms.resolution.value.set(je.z,je.w))}}class xn extends Vt{constructor(e=new $t,t=new rt({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type="Line2"}}const Me=new u,it=new u,wn=new u,gt=new et;function bn(i,e,t){const r=Me.setFromMatrixPosition(i.matrixWorld);r.project(e);const o=t.width/2,s=t.height/2;return[r.x*o+o,-(r.y*s)+s]}function Mn(i,e){const t=Me.setFromMatrixPosition(i.matrixWorld),r=it.setFromMatrixPosition(e.matrixWorld),o=t.sub(r),s=e.getWorldDirection(wn);return o.angleTo(s)>Math.PI/2}function Sn(i,e,t,r){const o=Me.setFromMatrixPosition(i.matrixWorld),s=o.clone();s.project(e),gt.set(s.x,s.y),t.setFromCamera(gt,e);const c=t.intersectObjects(r,!0);if(c.length){const l=c[0].distance;return o.distanceTo(t.ray.origin)<l}return!0}function En(i,e){if(e instanceof Tt)return e.zoom;if(e instanceof Wt){const t=Me.setFromMatrixPosition(i.matrixWorld),r=it.setFromMatrixPosition(e.matrixWorld),o=e.fov*Math.PI/180,s=t.distanceTo(r);return 1/(2*Math.tan(o/2)*s)}else return 1}function Pn(i,e,t){if(e instanceof Wt||e instanceof Tt){const r=Me.setFromMatrixPosition(i.matrixWorld),o=it.setFromMatrixPosition(e.matrixWorld),s=r.distanceTo(o),c=(t[1]-t[0])/(e.far-e.near),l=t[1]-c*e.far;return Math.round(c*s+l)}}const Ke=i=>Math.abs(i)<1e-10?0:i;function Gt(i,e,t=""){let r="matrix3d(";for(let o=0;o!==16;o++)r+=Ke(e[o]*i.elements[o])+(o!==15?",":")");return t+r}const Cn=(i=>e=>Gt(e,i))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),_n=(i=>(e,t)=>Gt(e,i(t),"translate(-50%,-50%)"))(i=>[1/i,1/i,1/i,1,-1/i,-1/i,-1/i,-1,1/i,1/i,1/i,1,1,1,1,1]);function On(i){return i&&typeof i=="object"&&"current"in i}const Te=n.forwardRef(({children:i,eps:e=.001,style:t,className:r,prepend:o,center:s,fullscreen:c,portal:l,distanceFactor:m,sprite:w=!1,transform:g=!1,occlude:a,onOcclude:_,castShadow:j,receiveShadow:R,material:I,geometry:W,zIndexRange:b=[16777271,0],calculatePosition:S=bn,as:p="div",wrapperClass:v,pointerEvents:O="auto",...C},T)=>{const{gl:N,camera:z,scene:$,size:U,raycaster:Y,events:Q,viewport:H}=re(),[L]=n.useState(()=>document.createElement(p)),x=n.useRef(),f=n.useRef(null),d=n.useRef(0),h=n.useRef([0,0]),E=n.useRef(null),P=n.useRef(null),M=(l==null?void 0:l.current)||Q.connected||N.domElement.parentNode,A=n.useRef(null),F=n.useRef(!1),y=n.useMemo(()=>a&&a!=="blending"||Array.isArray(a)&&a.length&&On(a[0]),[a]);n.useLayoutEffect(()=>{const X=N.domElement;a&&a==="blending"?(X.style.zIndex=`${Math.floor(b[0]/2)}`,X.style.position="absolute",X.style.pointerEvents="none"):(X.style.zIndex=null,X.style.position=null,X.style.pointerEvents=null)},[a]),n.useLayoutEffect(()=>{if(f.current){const X=x.current=Ft.createRoot(L);if($.updateMatrixWorld(),g)L.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{const D=S(f.current,z,U);L.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${D[0]}px,${D[1]}px,0);transform-origin:0 0;`}return M&&(o?M.prepend(L):M.appendChild(L)),()=>{M&&M.removeChild(L),X.unmount()}}},[M,g]),n.useLayoutEffect(()=>{v&&(L.className=v)},[v]);const Z=n.useMemo(()=>g?{position:"absolute",top:0,left:0,width:U.width,height:U.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:s?"translate3d(-50%,-50%,0)":"none",...c&&{top:-U.height/2,left:-U.width/2,width:U.width,height:U.height},...t},[t,s,c,U,g]),ie=n.useMemo(()=>({position:"absolute",pointerEvents:O}),[O]);n.useLayoutEffect(()=>{if(F.current=!1,g){var X;(X=x.current)==null||X.render(n.createElement("div",{ref:E,style:Z},n.createElement("div",{ref:P,style:ie},n.createElement("div",{ref:T,className:r,style:t,children:i}))))}else{var D;(D=x.current)==null||D.render(n.createElement("div",{ref:T,style:Z,className:r,children:i}))}});const V=n.useRef(!0);nt(X=>{if(f.current){z.updateMatrixWorld(),f.current.updateWorldMatrix(!0,!1);const D=g?h.current:S(f.current,z,U);if(g||Math.abs(d.current-z.zoom)>e||Math.abs(h.current[0]-D[0])>e||Math.abs(h.current[1]-D[1])>e){const se=Mn(f.current,z);let oe=!1;y&&(Array.isArray(a)?oe=a.map(ae=>ae.current):a!=="blending"&&(oe=[$]));const ye=V.current;if(oe){const ae=Sn(f.current,z,Y,oe);V.current=ae&&!se}else V.current=!se;ye!==V.current&&(_?_(!V.current):L.style.display=V.current?"block":"none");const Ee=Math.floor(b[0]/2),Jt=a?y?[b[0],Ee]:[Ee-1,0]:b;if(L.style.zIndex=`${Pn(f.current,z,Jt)}`,g){const[ae,st]=[U.width/2,U.height/2],Be=z.projectionMatrix.elements[5]*st,{isOrthographicCamera:at,top:Yt,left:Zt,bottom:Qt,right:Xt}=z,Kt=Cn(z.matrixWorldInverse),en=at?`scale(${Be})translate(${Ke(-(Xt+Zt)/2)}px,${Ke((Yt+Qt)/2)}px)`:`translateZ(${Be}px)`;let ce=f.current.matrixWorld;w&&(ce=z.matrixWorldInverse.clone().transpose().copyPosition(ce).scale(f.current.scale),ce.elements[3]=ce.elements[7]=ce.elements[11]=0,ce.elements[15]=1),L.style.width=U.width+"px",L.style.height=U.height+"px",L.style.perspective=at?"":`${Be}px`,E.current&&P.current&&(E.current.style.transform=`${en}${Kt}translate(${ae}px,${st}px)`,P.current.style.transform=_n(ce,1/((m||10)/400)))}else{const ae=m===void 0?1:En(f.current,z)*m;L.style.transform=`translate3d(${D[0]}px,${D[1]}px,0) scale(${ae})`}h.current=D,d.current=z.zoom}}if(!y&&A.current&&!F.current)if(g){if(E.current){const D=E.current.children[0];if(D!=null&&D.clientWidth&&D!=null&&D.clientHeight){const{isOrthographicCamera:se}=z;if(se||W)C.scale&&(Array.isArray(C.scale)?C.scale instanceof u?A.current.scale.copy(C.scale.clone().divideScalar(1)):A.current.scale.set(1/C.scale[0],1/C.scale[1],1/C.scale[2]):A.current.scale.setScalar(1/C.scale));else{const oe=(m||10)/400,ye=D.clientWidth*oe,Ee=D.clientHeight*oe;A.current.scale.set(ye,Ee,1)}F.current=!0}}}else{const D=L.children[0];if(D!=null&&D.clientWidth&&D!=null&&D.clientHeight){const se=1/H.factor,oe=D.clientWidth*se,ye=D.clientHeight*se;A.current.scale.set(oe,ye,1),F.current=!0}A.current.lookAt(X.camera.position)}});const k=n.useMemo(()=>({vertexShader:g?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[g]);return n.createElement("group",Ie({},C,{ref:f}),a&&!y&&n.createElement("mesh",{castShadow:j,receiveShadow:R,ref:A},W||n.createElement("planeGeometry",null),I||n.createElement("shaderMaterial",{side:We,vertexShader:k.vertexShader,fragmentShader:k.fragmentShader})))}),Ln=new u,Rn=new u,zn=new u,An=(i,e,t)=>{const r=t.width/2,o=t.height/2;e.updateMatrixWorld(!1);const s=i.project(e);return s.x=s.x*r+r,s.y=-(s.y*o)+o,s},Dn=(i,e,t,r=1)=>{const o=Ln.set(i.x/t.width*2-1,-(i.y/t.height)*2+1,r);return o.unproject(e),o},qt=(i,e,t,r)=>{const o=An(zn.copy(i),t,r);let s=0;for(let c=0;c<2;++c){const l=Rn.copy(o).setComponent(c,o.getComponent(c)+e),m=Dn(l,t,r,l.z);s=Math.max(s,i.distanceTo(m))}return s},Ue=n.forwardRef(function({points:e,color:t=16777215,vertexColors:r,linewidth:o,lineWidth:s,segments:c,dashed:l,...m},w){var g,a;const _=re(b=>b.size),j=n.useMemo(()=>c?new Vt:new xn,[c]),[R]=n.useState(()=>new rt),I=(r==null||(g=r[0])==null?void 0:g.length)===4?4:3,W=n.useMemo(()=>{const b=c?new ot:new $t,S=e.map(p=>{const v=Array.isArray(p);return p instanceof u||p instanceof ge?[p.x,p.y,p.z]:p instanceof et?[p.x,p.y,0]:v&&p.length===3?[p[0],p[1],p[2]]:v&&p.length===2?[p[0],p[1],0]:p});if(b.setPositions(S.flat()),r){t=16777215;const p=r.map(v=>v instanceof an?v.toArray():v);b.setColors(p.flat(),I)}return b},[e,c,r,I]);return n.useLayoutEffect(()=>{j.computeLineDistances()},[e,j]),n.useLayoutEffect(()=>{l?R.defines.USE_DASH="":delete R.defines.USE_DASH,R.needsUpdate=!0},[l,R]),n.useEffect(()=>()=>{W.dispose(),R.dispose()},[W]),n.createElement("primitive",Ie({object:j,ref:w},m),n.createElement("primitive",{object:W,attach:"geometry"}),n.createElement("primitive",Ie({object:R,attach:"material",color:t,vertexColors:!!r,resolution:[_.width,_.height],linewidth:(a=o??s)!==null&&a!==void 0?a:1,dashed:l,transparent:I===4},m)))}),Se=n.createContext(null),Oe=new u,yt=new u,In=(i,e,t,r)=>{const o=e.dot(e),s=e.dot(i)-e.dot(t),c=e.dot(r);return c===0?-s/o:(Oe.copy(r).multiplyScalar(o/c).sub(e),yt.copy(r).multiplyScalar(s/c).add(t).sub(i),-Oe.dot(yt)/Oe.dot(Oe))},Un=new u(0,1,0),vt=new B,He=({direction:i,axis:e})=>{const{translation:t,translationLimits:r,annotations:o,annotationsClass:s,depthTest:c,scale:l,lineWidth:m,fixed:w,axisColors:g,hoveredColor:a,opacity:_,onDragStart:j,onDrag:R,onDragEnd:I,userData:W}=n.useContext(Se),b=re(f=>f.controls),S=n.useRef(null),p=n.useRef(null),v=n.useRef(null),O=n.useRef(0),[C,T]=n.useState(!1),N=n.useCallback(f=>{o&&(S.current.innerText=`${t.current[e].toFixed(2)}`,S.current.style.display="block"),f.stopPropagation();const d=new B().extractRotation(p.current.matrixWorld),h=f.point.clone(),E=new u().setFromMatrixPosition(p.current.matrixWorld),P=i.clone().applyMatrix4(d).normalize();v.current={clickPoint:h,dir:P},O.current=t.current[e],j({component:"Arrow",axis:e,origin:E,directions:[P]}),b&&(b.enabled=!1),f.target.setPointerCapture(f.pointerId)},[o,i,b,j,t,e]),z=n.useCallback(f=>{if(f.stopPropagation(),C||T(!0),v.current){const{clickPoint:d,dir:h}=v.current,[E,P]=(r==null?void 0:r[e])||[void 0,void 0];let M=In(d,h,f.ray.origin,f.ray.direction);E!==void 0&&(M=Math.max(M,E-O.current)),P!==void 0&&(M=Math.min(M,P-O.current)),t.current[e]=O.current+M,o&&(S.current.innerText=`${t.current[e].toFixed(2)}`),vt.makeTranslation(h.x*M,h.y*M,h.z*M),R(vt)}},[o,R,C,t,r,e]),$=n.useCallback(f=>{o&&(S.current.style.display="none"),f.stopPropagation(),v.current=null,I(),b&&(b.enabled=!0),f.target.releasePointerCapture(f.pointerId)},[o,b,I]),U=n.useCallback(f=>{f.stopPropagation(),T(!1)},[]),{cylinderLength:Y,coneWidth:Q,coneLength:H,matrixL:L}=n.useMemo(()=>{const f=w?m/l*1.6:l/20,d=w?.2:l/5,h=w?1-d:l-d,E=new tt().setFromUnitVectors(Un,i.clone().normalize()),P=new B().makeRotationFromQuaternion(E);return{cylinderLength:h,coneWidth:f,coneLength:d,matrixL:P}},[i,l,m,w]),x=C?a:g[e];return n.createElement("group",{ref:p},n.createElement("group",{matrix:L,matrixAutoUpdate:!1,onPointerDown:N,onPointerMove:z,onPointerUp:$,onPointerOut:U},o&&n.createElement(Te,{position:[0,-H,0]},n.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:s,ref:S})),n.createElement("mesh",{visible:!1,position:[0,(Y+H)/2,0],userData:W},n.createElement("cylinderGeometry",{args:[Q*1.4,Q*1.4,Y+H,8,1]})),n.createElement(Ue,{transparent:!0,raycast:()=>null,depthTest:c,points:[0,0,0,0,Y,0],lineWidth:m,side:We,color:x,opacity:_,polygonOffset:!0,renderOrder:1,polygonOffsetFactor:-10,fog:!1}),n.createElement("mesh",{raycast:()=>null,position:[0,Y+H/2,0],renderOrder:500},n.createElement("coneGeometry",{args:[Q,H,24,1]}),n.createElement("meshBasicMaterial",{transparent:!0,depthTest:c,color:x,opacity:_,polygonOffset:!0,polygonOffsetFactor:-10,fog:!1}))))},Ne=new u,$e=new u,Ve=i=>i*180/Math.PI,Wn=i=>i*Math.PI/180,Tn=(i,e,t,r,o)=>{Ne.copy(i).sub(t),$e.copy(e).sub(t);const s=r.dot(r),c=o.dot(o),l=Ne.dot(r)/s,m=Ne.dot(o)/c,w=$e.dot(r)/s,g=$e.dot(o)/c,a=Math.atan2(m,l);return Math.atan2(g,w)-a},Bn=(i,e)=>{let t=Math.floor(i/e);return t=t<0?t+1:t,i-t*e},xt=i=>{let e=Bn(i,2*Math.PI);return Math.abs(e)<1e-6?0:(e<0&&(e+=2*Math.PI),e)},Le=new B,wt=new u,Re=new jt,Ge=new u,qe=({dir1:i,dir2:e,axis:t})=>{const{rotationLimits:r,annotations:o,annotationsClass:s,depthTest:c,scale:l,lineWidth:m,fixed:w,axisColors:g,hoveredColor:a,opacity:_,onDragStart:j,onDrag:R,onDragEnd:I,userData:W}=n.useContext(Se),b=re(x=>x.controls),S=n.useRef(null),p=n.useRef(null),v=n.useRef(0),O=n.useRef(0),C=n.useRef(null),[T,N]=n.useState(!1),z=n.useCallback(x=>{o&&(S.current.innerText=`${Ve(O.current).toFixed(0)}º`,S.current.style.display="block"),x.stopPropagation();const f=x.point.clone(),d=new u().setFromMatrixPosition(p.current.matrixWorld),h=new u().setFromMatrixColumn(p.current.matrixWorld,0).normalize(),E=new u().setFromMatrixColumn(p.current.matrixWorld,1).normalize(),P=new u().setFromMatrixColumn(p.current.matrixWorld,2).normalize(),M=new Bt().setFromNormalAndCoplanarPoint(P,d);C.current={clickPoint:f,origin:d,e1:h,e2:E,normal:P,plane:M},j({component:"Rotator",axis:t,origin:d,directions:[h,E,P]}),b&&(b.enabled=!1),x.target.setPointerCapture(x.pointerId)},[o,b,j,t]),$=n.useCallback(x=>{if(x.stopPropagation(),T||N(!0),C.current){const{clickPoint:f,origin:d,e1:h,e2:E,normal:P,plane:M}=C.current,[A,F]=(r==null?void 0:r[t])||[void 0,void 0];Re.copy(x.ray),Re.intersectPlane(M,Ge),Re.direction.negate(),Re.intersectPlane(M,Ge);let y=Tn(f,Ge,d,h,E),Z=Ve(y);x.shiftKey&&(Z=Math.round(Z/10)*10,y=Wn(Z)),A!==void 0&&F!==void 0&&F-A<2*Math.PI?(y=xt(y),y=y>Math.PI?y-2*Math.PI:y,y=Ut.clamp(y,A-v.current,F-v.current),O.current=v.current+y):(O.current=xt(v.current+y),O.current=O.current>Math.PI?O.current-2*Math.PI:O.current),o&&(Z=Ve(O.current),S.current.innerText=`${Z.toFixed(0)}º`),Le.makeRotationAxis(P,y),wt.copy(d).applyMatrix4(Le).sub(d).negate(),Le.setPosition(wt),R(Le)}},[o,R,T,r,t]),U=n.useCallback(x=>{o&&(S.current.style.display="none"),x.stopPropagation(),v.current=O.current,C.current=null,I(),b&&(b.enabled=!0),x.target.releasePointerCapture(x.pointerId)},[o,b,I]),Y=n.useCallback(x=>{x.stopPropagation(),N(!1)},[]),Q=n.useMemo(()=>{const x=i.clone().normalize(),f=e.clone().normalize();return new B().makeBasis(x,f,x.clone().cross(f))},[i,e]),H=w?.65:l*.65,L=n.useMemo(()=>{const f=[];for(let d=0;d<=32;d++){const h=d*(Math.PI/2)/32;f.push(new u(Math.cos(h)*H,Math.sin(h)*H,0))}return f},[H]);return n.createElement("group",{ref:p,onPointerDown:z,onPointerMove:$,onPointerUp:U,onPointerOut:Y,matrix:Q,matrixAutoUpdate:!1},o&&n.createElement(Te,{position:[H,H,0]},n.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:s,ref:S})),n.createElement(Ue,{points:L,lineWidth:m*4,visible:!1,userData:W}),n.createElement(Ue,{transparent:!0,raycast:()=>null,depthTest:c,points:L,lineWidth:m,side:We,color:T?a:g[t],opacity:_,polygonOffset:!0,polygonOffsetFactor:-10,fog:!1}))},jn=(i,e,t)=>{const r=Math.abs(i.x)>=Math.abs(i.y)&&Math.abs(i.x)>=Math.abs(i.z)?0:Math.abs(i.y)>=Math.abs(i.x)&&Math.abs(i.y)>=Math.abs(i.z)?1:2,o=[0,1,2].sort((R,I)=>Math.abs(e.getComponent(I))-Math.abs(e.getComponent(R))),s=r===o[0]?o[1]:o[0],c=i.getComponent(r),l=i.getComponent(s),m=e.getComponent(r),w=e.getComponent(s),g=t.getComponent(r),_=(t.getComponent(s)-g*(l/c))/(w-m*(l/c));return[(g-_*m)/c,_]},ze=new jt,Ae=new u,bt=new B,Je=({dir1:i,dir2:e,axis:t})=>{const{translation:r,translationLimits:o,annotations:s,annotationsClass:c,depthTest:l,scale:m,lineWidth:w,fixed:g,axisColors:a,hoveredColor:_,opacity:j,onDragStart:R,onDrag:I,onDragEnd:W,userData:b}=n.useContext(Se),S=re(h=>h.controls),p=n.useRef(null),v=n.useRef(null),O=n.useRef(null),C=n.useRef(0),T=n.useRef(0),[N,z]=n.useState(!1),$=n.useCallback(h=>{s&&(p.current.innerText=`${r.current[(t+1)%3].toFixed(2)}, ${r.current[(t+2)%3].toFixed(2)}`,p.current.style.display="block"),h.stopPropagation();const E=h.point.clone(),P=new u().setFromMatrixPosition(v.current.matrixWorld),M=new u().setFromMatrixColumn(v.current.matrixWorld,0).normalize(),A=new u().setFromMatrixColumn(v.current.matrixWorld,1).normalize(),F=new u().setFromMatrixColumn(v.current.matrixWorld,2).normalize(),y=new Bt().setFromNormalAndCoplanarPoint(F,P);O.current={clickPoint:E,e1:M,e2:A,plane:y},C.current=r.current[(t+1)%3],T.current=r.current[(t+2)%3],R({component:"Slider",axis:t,origin:P,directions:[M,A,F]}),S&&(S.enabled=!1),h.target.setPointerCapture(h.pointerId)},[s,S,R,t]),U=n.useCallback(h=>{if(h.stopPropagation(),N||z(!0),O.current){const{clickPoint:E,e1:P,e2:M,plane:A}=O.current,[F,y]=(o==null?void 0:o[(t+1)%3])||[void 0,void 0],[Z,ie]=(o==null?void 0:o[(t+2)%3])||[void 0,void 0];ze.copy(h.ray),ze.intersectPlane(A,Ae),ze.direction.negate(),ze.intersectPlane(A,Ae),Ae.sub(E);let[V,k]=jn(P,M,Ae);F!==void 0&&(V=Math.max(V,F-C.current)),y!==void 0&&(V=Math.min(V,y-C.current)),Z!==void 0&&(k=Math.max(k,Z-T.current)),ie!==void 0&&(k=Math.min(k,ie-T.current)),r.current[(t+1)%3]=C.current+V,r.current[(t+2)%3]=T.current+k,s&&(p.current.innerText=`${r.current[(t+1)%3].toFixed(2)}, ${r.current[(t+2)%3].toFixed(2)}`),bt.makeTranslation(V*P.x+k*M.x,V*P.y+k*M.y,V*P.z+k*M.z),I(bt)}},[s,I,N,r,o,t]),Y=n.useCallback(h=>{s&&(p.current.style.display="none"),h.stopPropagation(),O.current=null,W(),S&&(S.enabled=!0),h.target.releasePointerCapture(h.pointerId)},[s,S,W]),Q=n.useCallback(h=>{h.stopPropagation(),z(!1)},[]),H=n.useMemo(()=>{const h=i.clone().normalize(),E=e.clone().normalize();return new B().makeBasis(h,E,h.clone().cross(E))},[i,e]),L=g?1/7:m/7,x=g?.225:m*.225,f=N?_:a[t],d=n.useMemo(()=>[new u(0,0,0),new u(0,x,0),new u(x,x,0),new u(x,0,0),new u(0,0,0)],[x]);return n.createElement("group",{ref:v,matrix:H,matrixAutoUpdate:!1},s&&n.createElement(Te,{position:[0,0,0]},n.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:c,ref:p})),n.createElement("group",{position:[L*1.7,L*1.7,0]},n.createElement("mesh",{visible:!0,onPointerDown:$,onPointerMove:U,onPointerUp:Y,onPointerOut:Q,scale:x,userData:b},n.createElement("planeGeometry",null),n.createElement("meshBasicMaterial",{transparent:!0,depthTest:l,color:f,polygonOffset:!0,polygonOffsetFactor:-10,side:We,fog:!1})),n.createElement(Ue,{position:[-x/2,-x/2,0],transparent:!0,depthTest:l,points:d,lineWidth:w,color:f,opacity:j,polygonOffset:!0,polygonOffsetFactor:-10,userData:b,fog:!1})))},we=new u,Mt=new u,Fn=(i,e,t,r)=>{const o=e.dot(e),s=e.dot(i)-e.dot(t),c=e.dot(r);return c===0?-s/o:(we.copy(r).multiplyScalar(o/c).sub(e),Mt.copy(r).multiplyScalar(s/c).add(t).sub(i),-we.dot(Mt)/we.dot(we))},kn=new u(0,1,0),ve=new u,St=new B,Ye=({direction:i,axis:e})=>{const{scaleLimits:t,annotations:r,annotationsClass:o,depthTest:s,scale:c,lineWidth:l,fixed:m,axisColors:w,hoveredColor:g,opacity:a,onDragStart:_,onDrag:j,onDragEnd:R,userData:I}=n.useContext(Se),W=re(d=>d.size),b=re(d=>d.controls),S=n.useRef(null),p=n.useRef(null),v=n.useRef(null),O=n.useRef(1),C=n.useRef(1),T=n.useRef(null),[N,z]=n.useState(!1),$=m?1.2:1.2*c,U=n.useCallback(d=>{r&&(S.current.innerText=`${C.current.toFixed(2)}`,S.current.style.display="block"),d.stopPropagation();const h=new B().extractRotation(p.current.matrixWorld),E=d.point.clone(),P=new u().setFromMatrixPosition(p.current.matrixWorld),M=i.clone().applyMatrix4(h).normalize(),A=p.current.matrixWorld.clone(),F=A.clone().invert(),y=m?1/qt(p.current.getWorldPosition(we),c,d.camera,W):1;T.current={clickPoint:E,dir:M,mPLG:A,mPLGInv:F,offsetMultiplier:y},_({component:"Sphere",axis:e,origin:P,directions:[M]}),b&&(b.enabled=!1),d.target.setPointerCapture(d.pointerId)},[r,b,i,_,e,m,c,W]),Y=n.useCallback(d=>{if(d.stopPropagation(),N||z(!0),T.current){const{clickPoint:h,dir:E,mPLG:P,mPLGInv:M,offsetMultiplier:A}=T.current,[F,y]=(t==null?void 0:t[e])||[1e-5,void 0],ie=Fn(h,E,d.ray.origin,d.ray.direction)*A,V=m?ie:ie/c;let k=Math.pow(2,V*.2);d.shiftKey&&(k=Math.round(k*10)/10),k=Math.max(k,F/O.current),y!==void 0&&(k=Math.min(k,y/O.current)),C.current=O.current*k,v.current.position.set(0,$+ie,0),r&&(S.current.innerText=`${C.current.toFixed(2)}`),ve.set(1,1,1),ve.setComponent(e,k),St.makeScale(ve.x,ve.y,ve.z).premultiply(P).multiply(M),j(St)}},[r,$,j,N,t,e]),Q=n.useCallback(d=>{r&&(S.current.style.display="none"),d.stopPropagation(),O.current=C.current,T.current=null,v.current.position.set(0,$,0),R(),b&&(b.enabled=!0),d.target.releasePointerCapture(d.pointerId)},[r,b,R,$]),H=n.useCallback(d=>{d.stopPropagation(),z(!1)},[]),{radius:L,matrixL:x}=n.useMemo(()=>{const d=m?l/c*1.8:c/22.5,h=new tt().setFromUnitVectors(kn,i.clone().normalize()),E=new B().makeRotationFromQuaternion(h);return{radius:d,matrixL:E}},[i,c,l,m]),f=N?g:w[e];return n.createElement("group",{ref:p},n.createElement("group",{matrix:x,matrixAutoUpdate:!1,onPointerDown:U,onPointerMove:Y,onPointerUp:Q,onPointerOut:H},r&&n.createElement(Te,{position:[0,$/2,0]},n.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:o,ref:S})),n.createElement("mesh",{ref:v,position:[0,$,0],renderOrder:500,userData:I},n.createElement("sphereGeometry",{args:[L,12,12]}),n.createElement("meshBasicMaterial",{transparent:!0,depthTest:s,color:f,opacity:a,polygonOffset:!0,polygonOffsetFactor:-10}))))},Et=new B,Pt=new B,Ct=new B,De=new B,Ze=new B,ue=new B,_t=new B,Ot=new B,Lt=new B,de=new be,Qe=new be,Rt=new u,zt=new u,At=new u,Dt=new u,xe=new u,fe=new u(1,0,0),pe=new u(0,1,0),me=new u(0,0,1),Hn=n.forwardRef(({enabled:i=!0,matrix:e,onDragStart:t,onDrag:r,onDragEnd:o,autoTransform:s=!0,anchor:c,disableAxes:l=!1,disableSliders:m=!1,disableRotations:w=!1,disableScaling:g=!1,activeAxes:a=[!0,!0,!0],offset:_=[0,0,0],rotation:j=[0,0,0],scale:R=1,lineWidth:I=4,fixed:W=!1,translationLimits:b,rotationLimits:S,scaleLimits:p,depthTest:v=!0,axisColors:O=["#ff2060","#20df80","#2080ff"],hoveredColor:C="#ffff40",annotations:T=!1,annotationsClass:N,opacity:z=1,visible:$=!0,userData:U,children:Y,...Q},H)=>{const L=re(y=>y.invalidate),x=n.useRef(null),f=n.useRef(null),d=n.useRef(null),h=n.useRef(null),E=n.useRef([0,0,0]),P=n.useRef(new u(1,1,1)),M=n.useRef(new u(1,1,1));n.useLayoutEffect(()=>{c&&(h.current.updateWorldMatrix(!0,!0),De.copy(h.current.matrixWorld).invert(),de.makeEmpty(),h.current.traverse(y=>{y.geometry&&(y.geometry.boundingBox||y.geometry.computeBoundingBox(),ue.copy(y.matrixWorld).premultiply(De),Qe.copy(y.geometry.boundingBox),Qe.applyMatrix4(ue),de.union(Qe))}),Rt.copy(de.max).add(de.min).multiplyScalar(.5),zt.copy(de.max).sub(de.min).multiplyScalar(.5),At.copy(zt).multiply(new u(...c)).add(Rt),Dt.set(..._).add(At),d.current.position.copy(Dt),L())});const A=n.useMemo(()=>({onDragStart:y=>{Et.copy(f.current.matrix),Pt.copy(f.current.matrixWorld),t&&t(y),L()},onDrag:y=>{Ct.copy(x.current.matrixWorld),De.copy(Ct).invert(),Ze.copy(Pt).premultiply(y),ue.copy(Ze).premultiply(De),_t.copy(Et).invert(),Ot.copy(ue).multiply(_t),s&&f.current.matrix.copy(ue),r&&r(ue,Ot,Ze,y),L()},onDragEnd:()=>{o&&o(),L()},translation:E,translationLimits:b,rotationLimits:S,axisColors:O,hoveredColor:C,opacity:z,scale:R,lineWidth:I,fixed:W,depthTest:v,userData:U,annotations:T,annotationsClass:N}),[t,r,o,E,b,S,p,v,R,I,W,...O,C,z,U,s,T,N]),F=new u;return nt(y=>{if(W){const Z=qt(d.current.getWorldPosition(F),R,y.camera,y.size);P.current.setScalar(Z)}e&&e instanceof B&&(f.current.matrix=e),f.current.updateWorldMatrix(!0,!0),Lt.makeRotationFromEuler(d.current.rotation).setPosition(d.current.position).premultiply(f.current.matrixWorld),M.current.setFromMatrixScale(Lt),xe.copy(P.current).divide(M.current),(Math.abs(d.current.scale.x-xe.x)>1e-4||Math.abs(d.current.scale.y-xe.y)>1e-4||Math.abs(d.current.scale.z-xe.z)>1e-4)&&(d.current.scale.copy(xe),y.invalidate())}),n.useImperativeHandle(H,()=>f.current,[]),n.createElement(Se.Provider,{value:A},n.createElement("group",{ref:x},n.createElement("group",Ie({ref:f,matrix:e,matrixAutoUpdate:!1},Q),n.createElement("group",{visible:$,ref:d,position:_,rotation:j},i&&n.createElement(n.Fragment,null,!l&&a[0]&&n.createElement(He,{axis:0,direction:fe}),!l&&a[1]&&n.createElement(He,{axis:1,direction:pe}),!l&&a[2]&&n.createElement(He,{axis:2,direction:me}),!m&&a[0]&&a[1]&&n.createElement(Je,{axis:2,dir1:fe,dir2:pe}),!m&&a[0]&&a[2]&&n.createElement(Je,{axis:1,dir1:me,dir2:fe}),!m&&a[2]&&a[1]&&n.createElement(Je,{axis:0,dir1:pe,dir2:me}),!w&&a[0]&&a[1]&&n.createElement(qe,{axis:2,dir1:fe,dir2:pe}),!w&&a[0]&&a[2]&&n.createElement(qe,{axis:1,dir1:me,dir2:fe}),!w&&a[2]&&a[1]&&n.createElement(qe,{axis:0,dir1:pe,dir2:me}),!g&&a[0]&&n.createElement(Ye,{axis:0,direction:fe}),!g&&a[1]&&n.createElement(Ye,{axis:1,direction:pe}),!g&&a[2]&&n.createElement(Ye,{axis:2,direction:me}))),n.createElement("group",{ref:h},Y))))});function Nn({children:i,...e}){const t=re(r=>r.gl);return K.jsx(kt,{plugin:mn,args:{renderer:t,...e},children:i})}const $n=n.forwardRef(function(e,t){const{type:r,order:o=null,opacity:s=1,color:c=16777215,worldFrame:l=null,...m}=e,w=n.useContext(ln),g=n.useContext(un),a=n.useMemo(()=>new r(m),[r,qn(m)]);n.useEffect(()=>(w.addOverlay(a,o),()=>{w.deleteOverlay(a)}),[a,w]),n.useEffect(()=>{w.setOverlayOrder(a,o)},[a,w,o]),n.useEffect(()=>{a.opacity=s,a.color.set(c),l&&!a.frame?a.frame=l.clone():!l&&a.frame&&(a.frame=null)},[a,s,c,l]),nt(()=>{l&&g&&a.frame.copy(l).premultiply(g.group.matrixWorldInverse)}),Vn(a,t)});function Vn(i,...e){n.useEffect(()=>{e.forEach(t=>{t&&(t instanceof Function?t(i):t.current=i)})},[i,...e])}function Gn(i,e){if(i===e)return!0;if(!i||!e)return i===e;for(const t in i)if(i[t]!==e[t])return!1;for(const t in e)if(i[t]!==e[t])return!1;return!0}function qn(i){const e=n.useRef();return Gn(e.current,i)||(e.current=i),e.current}const Jn="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json";function Yn(){const i=n.useMemo(()=>{const e=new u().set(40,40,1),t=new u(-e.x,5,e.y*.25),r=new cn(-Math.PI/2),o=new tt().setFromEuler(r);return new B().compose(t,o,e)},[]);return K.jsxs(dn,{frameloop:"demand",camera:{position:[0,40,35]},style:{width:"100%",height:"100%",position:"absolute",margin:0,left:0,top:0},onContextMenu:e=>{e.preventDefault()},children:[K.jsx("color",{attach:"background",args:[2236962]}),K.jsx("group",{"rotation-x":Math.PI/2,children:K.jsxs(fn,{url:Jn,children:[K.jsx(kt,{plugin:gn,fadeDuration:500}),K.jsx(Nn,{children:K.jsx($n,{type:hn,assetId:"3954",apiToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGNiODVmZS1hNzliLTQ5NWYtOTdhOS02ZmIzMmZlYWRlMzAiLCJpZCI6MjY3NzgzLCJpYXQiOjE3MzY0Mjg0MTJ9.o7EtbJyQ6yNAgfHFal1RS1BKKM-RmZNusqBCeiowNZo",worldFrame:i})})]})}),K.jsx(pn,{enableDamping:!0,maxDistance:300,minDistance:1,cameraRadius:0}),K.jsx(Hn,{scale:150,matrix:i,fixed:!0})]})}Ft.createRoot(document.getElementById("root")).render(K.jsx(n.StrictMode,{children:K.jsx(Yn,{})}));
