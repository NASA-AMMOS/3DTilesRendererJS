import"./modulepreload-polyfill-B5Qt9EMX.js";import{r,g as pe,c as on,u as Qe,j as $,a as xt,b as Ln,d as On,C as An,T as Un,E as Rn}from"./CameraControls-CQWLZjoh.js";import{T as Dn}from"./TilesFadePlugin-BRcOjUD_.js";import{I as Bn,G as Tn}from"./ImageOverlayPlugin-C0MePglr.js";import{o as d,al as Ye,V as Ke,a as rn,O as sn,aJ as an,az as qe,aK as _e,aL as re,aM as cn,B as me,d as et,b as ln,U as Xe,aN as Pe,h as un,t as ie,aO as dn,n as W,M as St,C as Wn,Q as bt,av as fn,ah as pn,c as Ve,aP as In,k as jn,j as Fn}from"./three.module-D-uF--xd.js";import{_ as Ze,v as mn}from"./constants-C0SaZ5SG.js";import"./GlobeControls-4ScISV7m.js";import"./EnvironmentControls-BRF5UI-K.js";import"./Ellipsoid-Dwquuq5w.js";import"./I3DMLoader-BWluRuWb.js";import"./BatchTable-CRr3zuRk.js";import"./GLTFLoader-B4GrkiON.js";import"./constants-JFoaxC9y.js";import"./TilesRenderer-Bm042Xsy.js";import"./TilesRendererBase-CFsQu8zV.js";import"./B3DMLoader-Cnf0ja_2.js";import"./B3DMLoaderBase-w5mdSgm-.js";import"./PNTSLoader-DwvZQNdL.js";import"./CMPTLoader-BOTrymv0.js";import"./EllipsoidRegion-VNvPMw5b.js";import"./CesiumIonAuth-ByA9ya_o.js";import"./TMSImageSource-BIqdNmly.js";import"./TiledImageSource-DmD64Gn9.js";import"./GeometryClipper-7b525s21.js";class Hn{constructor(){this.name="ENFORCE_NONZERO_ERROR",this.priority=-1/0,this.originalError=new Map}preprocessNode(e){if(e.geometricError===0){let t=e.parent,n=1;for(;t!==null;){if(t.geometricError!==0){e.geometricError=t.geometricError*2**-n;break}t=t.parent,n++}}}}const Ae=new d,Et=new d,kn=new d,zt=new Ke;function Nn(i,e,t){const n=Ae.setFromMatrixPosition(i.matrixWorld);n.project(e);const o=t.width/2,s=t.height/2;return[n.x*o+o,-(n.y*s)+s]}function $n(i,e){const t=Ae.setFromMatrixPosition(i.matrixWorld),n=Et.setFromMatrixPosition(e.matrixWorld),o=t.sub(n),s=e.getWorldDirection(kn);return o.angleTo(s)>Math.PI/2}function Gn(i,e,t,n){const o=Ae.setFromMatrixPosition(i.matrixWorld),s=o.clone();s.project(e),zt.set(s.x,s.y),t.setFromCamera(zt,e);const c=t.intersectObjects(n,!0);if(c.length){const a=c[0].distance;return o.distanceTo(t.ray.origin)<a}return!0}function Vn(i,e){if(e instanceof sn)return e.zoom;if(e instanceof rn){const t=Ae.setFromMatrixPosition(i.matrixWorld),n=Et.setFromMatrixPosition(e.matrixWorld),o=e.fov*Math.PI/180,s=t.distanceTo(n);return 1/(2*Math.tan(o/2)*s)}else return 1}function qn(i,e,t){if(e instanceof rn||e instanceof sn){const n=Ae.setFromMatrixPosition(i.matrixWorld),o=Et.setFromMatrixPosition(e.matrixWorld),s=n.distanceTo(o),c=(t[1]-t[0])/(e.far-e.near),a=t[1]-c*e.far;return Math.round(c*s+a)}}const wt=i=>Math.abs(i)<1e-10?0:i;function hn(i,e,t=""){let n="matrix3d(";for(let o=0;o!==16;o++)n+=wt(e[o]*i.elements[o])+(o!==15?",":")");return t+n}const Xn=(i=>e=>hn(e,i))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),Zn=(i=>(e,t)=>hn(e,i(t),"translate(-50%,-50%)"))(i=>[1/i,1/i,1/i,1,-1/i,-1/i,-1/i,-1,1/i,1/i,1/i,1,1,1,1,1]);function Jn(i){return i&&typeof i=="object"&&"current"in i}const tt=r.forwardRef(({children:i,eps:e=.001,style:t,className:n,prepend:o,center:s,fullscreen:c,portal:a,distanceFactor:u,sprite:h=!1,transform:f=!1,occlude:l,onOcclude:b,castShadow:j,receiveShadow:O,material:A,geometry:R,zIndexRange:D=[16777271,0],calculatePosition:M=Nn,as:p="div",wrapperClass:y,pointerEvents:B="auto",...E},I)=>{const{gl:F,camera:L,scene:Q,size:U,raycaster:oe,events:Y,viewport:K}=pe(),[_]=r.useState(()=>document.createElement(p)),N=r.useRef(null),v=r.useRef(null),x=r.useRef(0),m=r.useRef([0,0]),g=r.useRef(null),C=r.useRef(null),P=(a==null?void 0:a.current)||Y.connected||F.domElement.parentNode,S=r.useRef(null),H=r.useRef(!1),k=r.useMemo(()=>l&&l!=="blending"||Array.isArray(l)&&l.length&&Jn(l[0]),[l]);r.useLayoutEffect(()=>{const z=F.domElement;l&&l==="blending"?(z.style.zIndex=`${Math.floor(D[0]/2)}`,z.style.position="absolute",z.style.pointerEvents="none"):(z.style.zIndex=null,z.style.position=null,z.style.pointerEvents=null)},[l]),r.useLayoutEffect(()=>{if(v.current){const z=N.current=on.createRoot(_);if(Q.updateMatrixWorld(),f)_.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{const T=M(v.current,L,U);_.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${T[0]}px,${T[1]}px,0);transform-origin:0 0;`}return P&&(o?P.prepend(_):P.appendChild(_)),()=>{P&&P.removeChild(_),z.unmount()}}},[P,f]),r.useLayoutEffect(()=>{y&&(_.className=y)},[y]);const w=r.useMemo(()=>f?{position:"absolute",top:0,left:0,width:U.width,height:U.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:s?"translate3d(-50%,-50%,0)":"none",...c&&{top:-U.height/2,left:-U.width/2,width:U.width,height:U.height},...t},[t,s,c,U,f]),ee=r.useMemo(()=>({position:"absolute",pointerEvents:B}),[B]);r.useLayoutEffect(()=>{if(H.current=!1,f){var z;(z=N.current)==null||z.render(r.createElement("div",{ref:g,style:w},r.createElement("div",{ref:C,style:ee},r.createElement("div",{ref:I,className:n,style:t,children:i}))))}else{var T;(T=N.current)==null||T.render(r.createElement("div",{ref:I,style:w,className:n,children:i}))}});const te=r.useRef(!0);Qe(z=>{if(v.current){L.updateMatrixWorld(),v.current.updateWorldMatrix(!0,!1);const T=f?m.current:M(v.current,L,U);if(f||Math.abs(x.current-L.zoom)>e||Math.abs(m.current[0]-T[0])>e||Math.abs(m.current[1]-T[1])>e){const he=$n(v.current,L);let fe=!1;k&&(Array.isArray(l)?fe=l.map(ge=>ge.current):l!=="blending"&&(fe=[Q]));const Ce=te.current;if(fe){const ge=Gn(v.current,L,oe,fe);te.current=ge&&!he}else te.current=!he;Ce!==te.current&&(b?b(!te.current):_.style.display=te.current?"block":"none");const Re=Math.floor(D[0]/2),bn=l?k?[D[0],Re]:[Re-1,0]:D;if(_.style.zIndex=`${qn(v.current,L,bn)}`,f){const[ge,_t]=[U.width/2,U.height/2],nt=L.projectionMatrix.elements[5]*_t,{isOrthographicCamera:Ct,top:En,left:Mn,bottom:Pn,right:_n}=L,Cn=Xn(L.matrixWorldInverse),zn=Ct?`scale(${nt})translate(${wt(-(_n+Mn)/2)}px,${wt((En+Pn)/2)}px)`:`translateZ(${nt}px)`;let ye=v.current.matrixWorld;h&&(ye=L.matrixWorldInverse.clone().transpose().copyPosition(ye).scale(v.current.scale),ye.elements[3]=ye.elements[7]=ye.elements[11]=0,ye.elements[15]=1),_.style.width=U.width+"px",_.style.height=U.height+"px",_.style.perspective=Ct?"":`${nt}px`,g.current&&C.current&&(g.current.style.transform=`${zn}${Cn}translate(${ge}px,${_t}px)`,C.current.style.transform=Zn(ye,1/((u||10)/400)))}else{const ge=u===void 0?1:Vn(v.current,L)*u;_.style.transform=`translate3d(${T[0]}px,${T[1]}px,0) scale(${ge})`}m.current=T,x.current=L.zoom}}if(!k&&S.current&&!H.current)if(f){if(g.current){const T=g.current.children[0];if(T!=null&&T.clientWidth&&T!=null&&T.clientHeight){const{isOrthographicCamera:he}=L;if(he||R)E.scale&&(Array.isArray(E.scale)?E.scale instanceof d?S.current.scale.copy(E.scale.clone().divideScalar(1)):S.current.scale.set(1/E.scale[0],1/E.scale[1],1/E.scale[2]):S.current.scale.setScalar(1/E.scale));else{const fe=(u||10)/400,Ce=T.clientWidth*fe,Re=T.clientHeight*fe;S.current.scale.set(Ce,Re,1)}H.current=!0}}}else{const T=_.children[0];if(T!=null&&T.clientWidth&&T!=null&&T.clientHeight){const he=1/K.factor,fe=T.clientWidth*he,Ce=T.clientHeight*he;S.current.scale.set(fe,Ce,1),H.current=!0}S.current.lookAt(z.camera.position)}});const ne=r.useMemo(()=>({vertexShader:f?void 0:`
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
      `}),[f]);return r.createElement("group",Ze({},E,{ref:v}),l&&!k&&r.createElement("mesh",{castShadow:j,receiveShadow:O,ref:S},R||r.createElement("planeGeometry",null),A||r.createElement("shaderMaterial",{side:Ye,vertexShader:ne.vertexShader,fragmentShader:ne.fragmentShader})))}),gn=mn>=125?"uv1":"uv2",Lt=new me,De=new d;let Mt=class extends an{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new qe(e,3)),this.setAttribute("uv",new qe(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new _e(t,6,1);return this.setAttribute("instanceStart",new re(n,3,0)),this.setAttribute("instanceEnd",new re(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));const o=new _e(n,t*2,1);return this.setAttribute("instanceColorStart",new re(o,t,0)),this.setAttribute("instanceColorEnd",new re(o,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new cn(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new me);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Lt.setFromBufferAttribute(t),this.boundingBox.union(Lt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new et),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let o=0;for(let s=0,c=e.count;s<c;s++)De.fromBufferAttribute(e,s),o=Math.max(o,n.distanceToSquared(De)),De.fromBufferAttribute(t,s),o=Math.max(o,n.distanceToSquared(De));this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}};class yn extends Mt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const t=e.length-3,n=new Float32Array(2*t);for(let o=0;o<t;o+=3)n[2*o]=e[o],n[2*o+1]=e[o+1],n[2*o+2]=e[o+2],n[2*o+3]=e[o+3],n[2*o+4]=e[o+4],n[2*o+5]=e[o+5];return super.setPositions(n),this}setColors(e,t=3){const n=e.length-t,o=new Float32Array(2*n);if(t===3)for(let s=0;s<n;s+=t)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5];else for(let s=0;s<n;s+=t)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5],o[2*s+6]=e[s+6],o[2*s+7]=e[s+7];return super.setColors(o,t),this}fromLine(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}}let Pt=class extends ln{constructor(e){super({type:"LineMaterial",uniforms:Xe.clone(Xe.merge([Pe.common,Pe.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Ke(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${mn>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(t){t===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(t){!!t!="USE_DASH"in this.defines&&(this.needsUpdate=!0),t===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}};const ot=new ie,Ot=new d,At=new d,G=new ie,V=new ie,se=new ie,rt=new d,it=new W,Z=new dn,Ut=new d,Be=new me,Te=new et,ae=new ie;let ue,ve;function Rt(i,e,t){return ae.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),ae.multiplyScalar(1/ae.w),ae.x=ve/t.width,ae.y=ve/t.height,ae.applyMatrix4(i.projectionMatrixInverse),ae.multiplyScalar(1/ae.w),Math.abs(Math.max(ae.x,ae.y))}function Qn(i,e){const t=i.matrixWorld,n=i.geometry,o=n.attributes.instanceStart,s=n.attributes.instanceEnd,c=Math.min(n.instanceCount,o.count);for(let a=0,u=c;a<u;a++){Z.start.fromBufferAttribute(o,a),Z.end.fromBufferAttribute(s,a),Z.applyMatrix4(t);const h=new d,f=new d;ue.distanceSqToSegment(Z.start,Z.end,f,h),f.distanceTo(h)<ve*.5&&e.push({point:f,pointOnLine:h,distance:ue.origin.distanceTo(f),object:i,face:null,faceIndex:a,uv:null,[gn]:null})}}function Yn(i,e,t){const n=e.projectionMatrix,s=i.material.resolution,c=i.matrixWorld,a=i.geometry,u=a.attributes.instanceStart,h=a.attributes.instanceEnd,f=Math.min(a.instanceCount,u.count),l=-e.near;ue.at(1,se),se.w=1,se.applyMatrix4(e.matrixWorldInverse),se.applyMatrix4(n),se.multiplyScalar(1/se.w),se.x*=s.x/2,se.y*=s.y/2,se.z=0,rt.copy(se),it.multiplyMatrices(e.matrixWorldInverse,c);for(let b=0,j=f;b<j;b++){if(G.fromBufferAttribute(u,b),V.fromBufferAttribute(h,b),G.w=1,V.w=1,G.applyMatrix4(it),V.applyMatrix4(it),G.z>l&&V.z>l)continue;if(G.z>l){const p=G.z-V.z,y=(G.z-l)/p;G.lerp(V,y)}else if(V.z>l){const p=V.z-G.z,y=(V.z-l)/p;V.lerp(G,y)}G.applyMatrix4(n),V.applyMatrix4(n),G.multiplyScalar(1/G.w),V.multiplyScalar(1/V.w),G.x*=s.x/2,G.y*=s.y/2,V.x*=s.x/2,V.y*=s.y/2,Z.start.copy(G),Z.start.z=0,Z.end.copy(V),Z.end.z=0;const A=Z.closestPointToPointParameter(rt,!0);Z.at(A,Ut);const R=St.lerp(G.z,V.z,A),D=R>=-1&&R<=1,M=rt.distanceTo(Ut)<ve*.5;if(D&&M){Z.start.fromBufferAttribute(u,b),Z.end.fromBufferAttribute(h,b),Z.start.applyMatrix4(c),Z.end.applyMatrix4(c);const p=new d,y=new d;ue.distanceSqToSegment(Z.start,Z.end,y,p),t.push({point:y,pointOnLine:p,distance:ue.origin.distanceTo(y),object:i,face:null,faceIndex:b,uv:null,[gn]:null})}}}let vn=class extends un{constructor(e=new Mt,t=new Pt({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,o=new Float32Array(2*t.count);for(let c=0,a=0,u=t.count;c<u;c++,a+=2)Ot.fromBufferAttribute(t,c),At.fromBufferAttribute(n,c),o[a]=a===0?0:o[a-1],o[a+1]=o[a]+Ot.distanceTo(At);const s=new _e(o,2,1);return e.setAttribute("instanceDistanceStart",new re(s,1,0)),e.setAttribute("instanceDistanceEnd",new re(s,1,1)),this}raycast(e,t){const n=this.material.worldUnits,o=e.camera;o===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;ue=e.ray;const c=this.matrixWorld,a=this.geometry,u=this.material;ve=u.linewidth+s,a.boundingSphere===null&&a.computeBoundingSphere(),Te.copy(a.boundingSphere).applyMatrix4(c);let h;if(n)h=ve*.5;else{const l=Math.max(o.near,Te.distanceToPoint(ue.origin));h=Rt(o,l,u.resolution)}if(Te.radius+=h,ue.intersectsSphere(Te)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),Be.copy(a.boundingBox).applyMatrix4(c);let f;if(n)f=ve*.5;else{const l=Math.max(o.near,Be.distanceToPoint(ue.origin));f=Rt(o,l,u.resolution)}Be.expandByScalar(f),ue.intersectsBox(Be)!==!1&&(n?Qn(this,t):Yn(this,o,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(ot),this.material.uniforms.resolution.value.set(ot.z,ot.w))}};class Kn extends vn{constructor(e=new yn,t=new Pt({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type="Line2"}}const eo=new d,to=new d,no=new d,oo=(i,e,t)=>{const n=t.width/2,o=t.height/2;e.updateMatrixWorld(!1);const s=i.project(e);return s.x=s.x*n+n,s.y=-(s.y*o)+o,s},ro=(i,e,t,n=1)=>{const o=eo.set(i.x/t.width*2-1,-(i.y/t.height)*2+1,n);return o.unproject(e),o},xn=(i,e,t,n)=>{const o=oo(no.copy(i),t,n);let s=0;for(let c=0;c<2;++c){const a=to.copy(o).setComponent(c,o.getComponent(c)+e),u=ro(a,t,n,a.z);s=Math.max(s,i.distanceTo(u))}return s},Je=r.forwardRef(function({points:e,color:t=16777215,vertexColors:n,linewidth:o,lineWidth:s,segments:c,dashed:a,...u},h){var f,l;const b=pe(D=>D.size),j=r.useMemo(()=>c?new vn:new Kn,[c]),[O]=r.useState(()=>new Pt),A=(n==null||(f=n[0])==null?void 0:f.length)===4?4:3,R=r.useMemo(()=>{const D=c?new Mt:new yn,M=e.map(p=>{const y=Array.isArray(p);return p instanceof d||p instanceof ie?[p.x,p.y,p.z]:p instanceof Ke?[p.x,p.y,0]:y&&p.length===3?[p[0],p[1],p[2]]:y&&p.length===2?[p[0],p[1],0]:p});if(D.setPositions(M.flat()),n){t=16777215;const p=n.map(y=>y instanceof Wn?y.toArray():y);D.setColors(p.flat(),A)}return D},[e,c,n,A]);return r.useLayoutEffect(()=>{j.computeLineDistances()},[e,j]),r.useLayoutEffect(()=>{a?O.defines.USE_DASH="":delete O.defines.USE_DASH,O.needsUpdate=!0},[a,O]),r.useEffect(()=>()=>{R.dispose(),O.dispose()},[R]),r.createElement("primitive",Ze({object:j,ref:h},u),r.createElement("primitive",{object:R,attach:"geometry"}),r.createElement("primitive",Ze({object:O,attach:"material",color:t,vertexColors:!!n,resolution:[b.width,b.height],linewidth:(l=o??s)!==null&&l!==void 0?l:1,dashed:a,transparent:A===4},u)))}),Ue=r.createContext(null),We=new d,Dt=new d,io=(i,e,t,n)=>{const o=e.dot(e),s=e.dot(i)-e.dot(t),c=e.dot(n);return c===0?-s/o:(We.copy(n).multiplyScalar(o/c).sub(e),Dt.copy(n).multiplyScalar(s/c).add(t).sub(i),-We.dot(Dt)/We.dot(We))},so=new d(0,1,0),Bt=new W,st=({direction:i,axis:e})=>{const{translation:t,translationLimits:n,annotations:o,annotationsClass:s,depthTest:c,scale:a,lineWidth:u,fixed:h,axisColors:f,hoveredColor:l,opacity:b,renderOrder:j,onDragStart:O,onDrag:A,onDragEnd:R,userData:D}=r.useContext(Ue),M=pe(x=>x.controls),p=r.useRef(null),y=r.useRef(null),B=r.useRef(null),E=r.useRef(0),[I,F]=r.useState(!1),L=r.useCallback(x=>{o&&(p.current.innerText=`${t.current[e].toFixed(2)}`,p.current.style.display="block"),x.stopPropagation();const m=new W().extractRotation(y.current.matrixWorld),g=x.point.clone(),C=new d().setFromMatrixPosition(y.current.matrixWorld),P=i.clone().applyMatrix4(m).normalize();B.current={clickPoint:g,dir:P},E.current=t.current[e],O({component:"Arrow",axis:e,origin:C,directions:[P]}),M&&(M.enabled=!1),x.target.setPointerCapture(x.pointerId)},[o,i,M,O,t,e]),Q=r.useCallback(x=>{if(x.stopPropagation(),I||F(!0),B.current){const{clickPoint:m,dir:g}=B.current,[C,P]=(n==null?void 0:n[e])||[void 0,void 0];let S=io(m,g,x.ray.origin,x.ray.direction);C!==void 0&&(S=Math.max(S,C-E.current)),P!==void 0&&(S=Math.min(S,P-E.current)),t.current[e]=E.current+S,o&&(p.current.innerText=`${t.current[e].toFixed(2)}`),Bt.makeTranslation(g.x*S,g.y*S,g.z*S),A(Bt)}},[o,A,I,t,n,e]),U=r.useCallback(x=>{o&&(p.current.style.display="none"),x.stopPropagation(),B.current=null,R(),M&&(M.enabled=!0),x.target.releasePointerCapture(x.pointerId)},[o,M,R]),oe=r.useCallback(x=>{x.stopPropagation(),F(!1)},[]),{cylinderLength:Y,coneWidth:K,coneLength:_,matrixL:N}=r.useMemo(()=>{const x=h?u/a*1.6:a/20,m=h?.2:a/5,g=h?1-m:a-m,C=new bt().setFromUnitVectors(so,i.clone().normalize()),P=new W().makeRotationFromQuaternion(C);return{cylinderLength:g,coneWidth:x,coneLength:m,matrixL:P}},[i,a,u,h]),v=I?l:f[e];return r.createElement("group",{ref:y},r.createElement("group",{matrix:N,matrixAutoUpdate:!1,onPointerDown:L,onPointerMove:Q,onPointerUp:U,onPointerOut:oe},o&&r.createElement(tt,{position:[0,-_,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:s,ref:p})),r.createElement("mesh",{visible:!1,position:[0,(Y+_)/2,0],userData:D},r.createElement("cylinderGeometry",{args:[K*1.4,K*1.4,Y+_,8,1]})),r.createElement(Je,{transparent:!0,raycast:()=>null,depthTest:c,points:[0,0,0,0,Y,0],lineWidth:u,side:Ye,color:v,opacity:b,polygonOffset:!0,renderOrder:j,polygonOffsetFactor:-10,fog:!1}),r.createElement("mesh",{raycast:()=>null,position:[0,Y+_/2,0],renderOrder:j},r.createElement("coneGeometry",{args:[K,_,24,1]}),r.createElement("meshBasicMaterial",{transparent:!0,depthTest:c,color:v,opacity:b,polygonOffset:!0,polygonOffsetFactor:-10,fog:!1}))))},at=new d,ct=new d,lt=i=>i*180/Math.PI,ao=i=>i*Math.PI/180,co=(i,e,t,n,o)=>{at.copy(i).sub(t),ct.copy(e).sub(t);const s=n.dot(n),c=o.dot(o),a=at.dot(n)/s,u=at.dot(o)/c,h=ct.dot(n)/s,f=ct.dot(o)/c,l=Math.atan2(u,a);return Math.atan2(f,h)-l},lo=(i,e)=>{let t=Math.floor(i/e);return t=t<0?t+1:t,i-t*e},Tt=i=>{let e=lo(i,2*Math.PI);return Math.abs(e)<1e-6?0:(e<0&&(e+=2*Math.PI),e)},Ie=new W,Wt=new d,je=new pn,ut=new d,dt=({dir1:i,dir2:e,axis:t})=>{const{rotationLimits:n,annotations:o,annotationsClass:s,depthTest:c,scale:a,lineWidth:u,fixed:h,axisColors:f,hoveredColor:l,renderOrder:b,opacity:j,onDragStart:O,onDrag:A,onDragEnd:R,userData:D}=r.useContext(Ue),M=pe(v=>v.controls),p=r.useRef(null),y=r.useRef(null),B=r.useRef(0),E=r.useRef(0),I=r.useRef(null),[F,L]=r.useState(!1),Q=r.useCallback(v=>{o&&(p.current.innerText=`${lt(E.current).toFixed(0)}º`,p.current.style.display="block"),v.stopPropagation();const x=v.point.clone(),m=new d().setFromMatrixPosition(y.current.matrixWorld),g=new d().setFromMatrixColumn(y.current.matrixWorld,0).normalize(),C=new d().setFromMatrixColumn(y.current.matrixWorld,1).normalize(),P=new d().setFromMatrixColumn(y.current.matrixWorld,2).normalize(),S=new fn().setFromNormalAndCoplanarPoint(P,m);I.current={clickPoint:x,origin:m,e1:g,e2:C,normal:P,plane:S},O({component:"Rotator",axis:t,origin:m,directions:[g,C,P]}),M&&(M.enabled=!1),v.target.setPointerCapture(v.pointerId)},[o,M,O,t]),U=r.useCallback(v=>{if(v.stopPropagation(),F||L(!0),I.current){const{clickPoint:x,origin:m,e1:g,e2:C,normal:P,plane:S}=I.current,[H,k]=(n==null?void 0:n[t])||[void 0,void 0];je.copy(v.ray),je.intersectPlane(S,ut),je.direction.negate(),je.intersectPlane(S,ut);let w=co(x,ut,m,g,C),ee=lt(w);v.shiftKey&&(ee=Math.round(ee/10)*10,w=ao(ee)),H!==void 0&&k!==void 0&&k-H<2*Math.PI?(w=Tt(w),w=w>Math.PI?w-2*Math.PI:w,w=St.clamp(w,H-B.current,k-B.current),E.current=B.current+w):(E.current=Tt(B.current+w),E.current=E.current>Math.PI?E.current-2*Math.PI:E.current),o&&(ee=lt(E.current),p.current.innerText=`${ee.toFixed(0)}º`),Ie.makeRotationAxis(P,w),Wt.copy(m).applyMatrix4(Ie).sub(m).negate(),Ie.setPosition(Wt),A(Ie)}},[o,A,F,n,t]),oe=r.useCallback(v=>{o&&(p.current.style.display="none"),v.stopPropagation(),B.current=E.current,I.current=null,R(),M&&(M.enabled=!0),v.target.releasePointerCapture(v.pointerId)},[o,M,R]),Y=r.useCallback(v=>{v.stopPropagation(),L(!1)},[]),K=r.useMemo(()=>{const v=i.clone().normalize(),x=e.clone().normalize();return new W().makeBasis(v,x,v.clone().cross(x))},[i,e]),_=h?.65:a*.65,N=r.useMemo(()=>{const x=[];for(let m=0;m<=32;m++){const g=m*(Math.PI/2)/32;x.push(new d(Math.cos(g)*_,Math.sin(g)*_,0))}return x},[_]);return r.createElement("group",{ref:y,onPointerDown:Q,onPointerMove:U,onPointerUp:oe,onPointerOut:Y,matrix:K,matrixAutoUpdate:!1},o&&r.createElement(tt,{position:[_,_,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:s,ref:p})),r.createElement(Je,{points:N,lineWidth:u*4,visible:!1,userData:D}),r.createElement(Je,{transparent:!0,raycast:()=>null,depthTest:c,points:N,lineWidth:u,side:Ye,color:F?l:f[t],opacity:j,polygonOffset:!0,polygonOffsetFactor:-10,renderOrder:b,fog:!1}))},uo=(i,e,t)=>{const n=Math.abs(i.x)>=Math.abs(i.y)&&Math.abs(i.x)>=Math.abs(i.z)?0:Math.abs(i.y)>=Math.abs(i.x)&&Math.abs(i.y)>=Math.abs(i.z)?1:2,o=[0,1,2].sort((O,A)=>Math.abs(e.getComponent(A))-Math.abs(e.getComponent(O))),s=n===o[0]?o[1]:o[0],c=i.getComponent(n),a=i.getComponent(s),u=e.getComponent(n),h=e.getComponent(s),f=t.getComponent(n),b=(t.getComponent(s)-f*(a/c))/(h-u*(a/c));return[(f-b*u)/c,b]},Fe=new pn,He=new d,It=new W,ft=({dir1:i,dir2:e,axis:t})=>{const{translation:n,translationLimits:o,annotations:s,annotationsClass:c,depthTest:a,scale:u,lineWidth:h,fixed:f,axisColors:l,hoveredColor:b,opacity:j,renderOrder:O,onDragStart:A,onDrag:R,onDragEnd:D,userData:M}=r.useContext(Ue),p=pe(g=>g.controls),y=r.useRef(null),B=r.useRef(null),E=r.useRef(null),I=r.useRef(0),F=r.useRef(0),[L,Q]=r.useState(!1),U=r.useCallback(g=>{s&&(y.current.innerText=`${n.current[(t+1)%3].toFixed(2)}, ${n.current[(t+2)%3].toFixed(2)}`,y.current.style.display="block"),g.stopPropagation();const C=g.point.clone(),P=new d().setFromMatrixPosition(B.current.matrixWorld),S=new d().setFromMatrixColumn(B.current.matrixWorld,0).normalize(),H=new d().setFromMatrixColumn(B.current.matrixWorld,1).normalize(),k=new d().setFromMatrixColumn(B.current.matrixWorld,2).normalize(),w=new fn().setFromNormalAndCoplanarPoint(k,P);E.current={clickPoint:C,e1:S,e2:H,plane:w},I.current=n.current[(t+1)%3],F.current=n.current[(t+2)%3],A({component:"Slider",axis:t,origin:P,directions:[S,H,k]}),p&&(p.enabled=!1),g.target.setPointerCapture(g.pointerId)},[s,p,A,t]),oe=r.useCallback(g=>{if(g.stopPropagation(),L||Q(!0),E.current){const{clickPoint:C,e1:P,e2:S,plane:H}=E.current,[k,w]=(o==null?void 0:o[(t+1)%3])||[void 0,void 0],[ee,te]=(o==null?void 0:o[(t+2)%3])||[void 0,void 0];Fe.copy(g.ray),Fe.intersectPlane(H,He),Fe.direction.negate(),Fe.intersectPlane(H,He),He.sub(C);let[ne,z]=uo(P,S,He);k!==void 0&&(ne=Math.max(ne,k-I.current)),w!==void 0&&(ne=Math.min(ne,w-I.current)),ee!==void 0&&(z=Math.max(z,ee-F.current)),te!==void 0&&(z=Math.min(z,te-F.current)),n.current[(t+1)%3]=I.current+ne,n.current[(t+2)%3]=F.current+z,s&&(y.current.innerText=`${n.current[(t+1)%3].toFixed(2)}, ${n.current[(t+2)%3].toFixed(2)}`),It.makeTranslation(ne*P.x+z*S.x,ne*P.y+z*S.y,ne*P.z+z*S.z),R(It)}},[s,R,L,n,o,t]),Y=r.useCallback(g=>{s&&(y.current.style.display="none"),g.stopPropagation(),E.current=null,D(),p&&(p.enabled=!0),g.target.releasePointerCapture(g.pointerId)},[s,p,D]),K=r.useCallback(g=>{g.stopPropagation(),Q(!1)},[]),_=r.useMemo(()=>{const g=i.clone().normalize(),C=e.clone().normalize();return new W().makeBasis(g,C,g.clone().cross(C))},[i,e]),N=f?1/7:u/7,v=f?.225:u*.225,x=L?b:l[t],m=r.useMemo(()=>[new d(0,0,0),new d(0,v,0),new d(v,v,0),new d(v,0,0),new d(0,0,0)],[v]);return r.createElement("group",{ref:B,matrix:_,matrixAutoUpdate:!1},s&&r.createElement(tt,{position:[0,0,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:c,ref:y})),r.createElement("group",{position:[N*1.7,N*1.7,0]},r.createElement("mesh",{visible:!0,onPointerDown:U,onPointerMove:oe,onPointerUp:Y,onPointerOut:K,scale:v,userData:M,renderOrder:O},r.createElement("planeGeometry",null),r.createElement("meshBasicMaterial",{transparent:!0,depthTest:a,color:x,polygonOffset:!0,polygonOffsetFactor:-10,side:Ye,fog:!1})),r.createElement(Je,{position:[-v/2,-v/2,0],transparent:!0,depthTest:a,points:m,lineWidth:h,color:x,opacity:j,polygonOffset:!0,polygonOffsetFactor:-10,userData:M,fog:!1,renderOrder:O})))},Oe=new d,jt=new d,fo=(i,e,t,n)=>{const o=e.dot(e),s=e.dot(i)-e.dot(t),c=e.dot(n);return c===0?-s/o:(Oe.copy(n).multiplyScalar(o/c).sub(e),jt.copy(n).multiplyScalar(s/c).add(t).sub(i),-Oe.dot(jt)/Oe.dot(Oe))},po=new d(0,1,0),ze=new d,Ft=new W,pt=({direction:i,axis:e})=>{const{scaleLimits:t,annotations:n,annotationsClass:o,depthTest:s,scale:c,lineWidth:a,fixed:u,axisColors:h,hoveredColor:f,opacity:l,renderOrder:b,onDragStart:j,onDrag:O,onDragEnd:A,userData:R}=r.useContext(Ue),D=pe(m=>m.size),M=pe(m=>m.controls),p=r.useRef(null),y=r.useRef(null),B=r.useRef(null),E=r.useRef(1),I=r.useRef(1),F=r.useRef(null),[L,Q]=r.useState(!1),U=u?1.2:1.2*c,oe=r.useCallback(m=>{n&&(p.current.innerText=`${I.current.toFixed(2)}`,p.current.style.display="block"),m.stopPropagation();const g=new W().extractRotation(y.current.matrixWorld),C=m.point.clone(),P=new d().setFromMatrixPosition(y.current.matrixWorld),S=i.clone().applyMatrix4(g).normalize(),H=y.current.matrixWorld.clone(),k=H.clone().invert(),w=u?1/xn(y.current.getWorldPosition(Oe),c,m.camera,D):1;F.current={clickPoint:C,dir:S,mPLG:H,mPLGInv:k,offsetMultiplier:w},j({component:"Sphere",axis:e,origin:P,directions:[S]}),M&&(M.enabled=!1),m.target.setPointerCapture(m.pointerId)},[n,M,i,j,e,u,c,D]),Y=r.useCallback(m=>{if(m.stopPropagation(),L||Q(!0),F.current){const{clickPoint:g,dir:C,mPLG:P,mPLGInv:S,offsetMultiplier:H}=F.current,[k,w]=(t==null?void 0:t[e])||[1e-5,void 0],te=fo(g,C,m.ray.origin,m.ray.direction)*H,ne=u?te:te/c;let z=Math.pow(2,ne*.2);m.shiftKey&&(z=Math.round(z*10)/10),z=Math.max(z,k/E.current),w!==void 0&&(z=Math.min(z,w/E.current)),I.current=E.current*z,B.current.position.set(0,U+te,0),n&&(p.current.innerText=`${I.current.toFixed(2)}`),ze.set(1,1,1),ze.setComponent(e,z),Ft.makeScale(ze.x,ze.y,ze.z).premultiply(P).multiply(S),O(Ft)}},[n,U,O,L,t,e]),K=r.useCallback(m=>{n&&(p.current.style.display="none"),m.stopPropagation(),E.current=I.current,F.current=null,B.current.position.set(0,U,0),A(),M&&(M.enabled=!0),m.target.releasePointerCapture(m.pointerId)},[n,M,A,U]),_=r.useCallback(m=>{m.stopPropagation(),Q(!1)},[]),{radius:N,matrixL:v}=r.useMemo(()=>{const m=u?a/c*1.8:c/22.5,g=new bt().setFromUnitVectors(po,i.clone().normalize()),C=new W().makeRotationFromQuaternion(g);return{radius:m,matrixL:C}},[i,c,a,u]),x=L?f:h[e];return r.createElement("group",{ref:y},r.createElement("group",{matrix:v,matrixAutoUpdate:!1,onPointerDown:oe,onPointerMove:Y,onPointerUp:K,onPointerOut:_},n&&r.createElement(tt,{position:[0,U/2,0]},r.createElement("div",{style:{display:"none",background:"#151520",color:"white",padding:"6px 8px",borderRadius:7,whiteSpace:"nowrap"},className:o,ref:p})),r.createElement("mesh",{ref:B,position:[0,U,0],renderOrder:b,userData:R},r.createElement("sphereGeometry",{args:[N,12,12]}),r.createElement("meshBasicMaterial",{transparent:!0,depthTest:s,color:x,opacity:l,polygonOffset:!0,polygonOffsetFactor:-10}))))},Ht=new W,kt=new W,Nt=new W,ke=new W,mt=new W,we=new W,$t=new W,Gt=new W,Vt=new W,Se=new me,ht=new me,qt=new d,Xt=new d,Zt=new d,Jt=new d,Le=new d,be=new d(1,0,0),Ee=new d(0,1,0),Me=new d(0,0,1),mo=r.forwardRef(({enabled:i=!0,matrix:e,onDragStart:t,onDrag:n,onDragEnd:o,autoTransform:s=!0,anchor:c,disableAxes:a=!1,disableSliders:u=!1,disableRotations:h=!1,disableScaling:f=!1,activeAxes:l=[!0,!0,!0],offset:b=[0,0,0],rotation:j=[0,0,0],scale:O=1,lineWidth:A=4,fixed:R=!1,translationLimits:D,rotationLimits:M,scaleLimits:p,depthTest:y=!0,renderOrder:B=500,axisColors:E=["#ff2060","#20df80","#2080ff"],hoveredColor:I="#ffff40",annotations:F=!1,annotationsClass:L,opacity:Q=1,visible:U=!0,userData:oe,children:Y,...K},_)=>{const N=pe(w=>w.invalidate),v=r.useRef(null),x=r.useRef(null),m=r.useRef(null),g=r.useRef(null),C=r.useRef([0,0,0]),P=r.useRef(new d(1,1,1)),S=r.useRef(new d(1,1,1));r.useLayoutEffect(()=>{c&&(g.current.updateWorldMatrix(!0,!0),ke.copy(g.current.matrixWorld).invert(),Se.makeEmpty(),g.current.traverse(w=>{w.geometry&&(w.geometry.boundingBox||w.geometry.computeBoundingBox(),we.copy(w.matrixWorld).premultiply(ke),ht.copy(w.geometry.boundingBox),ht.applyMatrix4(we),Se.union(ht))}),qt.copy(Se.max).add(Se.min).multiplyScalar(.5),Xt.copy(Se.max).sub(Se.min).multiplyScalar(.5),Zt.copy(Xt).multiply(new d(...c)).add(qt),Jt.set(...b).add(Zt),m.current.position.copy(Jt),N())});const H=r.useMemo(()=>({onDragStart:w=>{Ht.copy(x.current.matrix),kt.copy(x.current.matrixWorld),t&&t(w),N()},onDrag:w=>{Nt.copy(v.current.matrixWorld),ke.copy(Nt).invert(),mt.copy(kt).premultiply(w),we.copy(mt).premultiply(ke),$t.copy(Ht).invert(),Gt.copy(we).multiply($t),s&&x.current.matrix.copy(we),n&&n(we,Gt,mt,w),N()},onDragEnd:()=>{o&&o(),N()},translation:C,translationLimits:D,rotationLimits:M,axisColors:E,hoveredColor:I,opacity:Q,scale:O,lineWidth:A,fixed:R,depthTest:y,renderOrder:B,userData:oe,annotations:F,annotationsClass:L}),[t,n,o,C,D,M,p,y,O,A,R,...E,I,Q,oe,s,F,L]),k=new d;return Qe(w=>{if(R){const ee=xn(m.current.getWorldPosition(k),O,w.camera,w.size);P.current.setScalar(ee)}e&&e instanceof W&&(x.current.matrix=e),x.current.updateWorldMatrix(!0,!0),Vt.makeRotationFromEuler(m.current.rotation).setPosition(m.current.position).premultiply(x.current.matrixWorld),S.current.setFromMatrixScale(Vt),Le.copy(P.current).divide(S.current),(Math.abs(m.current.scale.x-Le.x)>1e-4||Math.abs(m.current.scale.y-Le.y)>1e-4||Math.abs(m.current.scale.z-Le.z)>1e-4)&&(m.current.scale.copy(Le),w.invalidate())}),r.useImperativeHandle(_,()=>x.current,[]),r.createElement(Ue.Provider,{value:H},r.createElement("group",{ref:v},r.createElement("group",Ze({ref:x,matrix:e,matrixAutoUpdate:!1},K),r.createElement("group",{visible:U,ref:m,position:b,rotation:j},i&&r.createElement(r.Fragment,null,!a&&l[0]&&r.createElement(st,{axis:0,direction:be}),!a&&l[1]&&r.createElement(st,{axis:1,direction:Ee}),!a&&l[2]&&r.createElement(st,{axis:2,direction:Me}),!u&&l[0]&&l[1]&&r.createElement(ft,{axis:2,dir1:be,dir2:Ee}),!u&&l[0]&&l[2]&&r.createElement(ft,{axis:1,dir1:Me,dir2:be}),!u&&l[2]&&l[1]&&r.createElement(ft,{axis:0,dir1:Ee,dir2:Me}),!h&&l[0]&&l[1]&&r.createElement(dt,{axis:2,dir1:be,dir2:Ee}),!h&&l[0]&&l[2]&&r.createElement(dt,{axis:1,dir1:Me,dir2:be}),!h&&l[2]&&l[1]&&r.createElement(dt,{axis:0,dir1:Ee,dir2:Me}),!f&&l[0]&&r.createElement(pt,{axis:0,direction:be}),!f&&l[1]&&r.createElement(pt,{axis:1,direction:Ee}),!f&&l[2]&&r.createElement(pt,{axis:2,direction:Me}))),r.createElement("group",{ref:g},Y))))}),ho=r.forwardRef(function({children:e,...t},n){const o=pe(s=>s.gl);return $.jsx(xt,{plugin:Bn,args:{renderer:o,...t},ref:n,children:e})}),go=r.forwardRef(function(e,t){const{type:n,order:o=null,opacity:s=1,color:c=16777215,worldToProjection:a=null,...u}=e,h=r.useContext(Ln),f=r.useContext(On),l=r.useMemo(()=>new n(u),[n,xo(u)]);r.useEffect(()=>(h.addOverlay(l,o),()=>{h.deleteOverlay(l)}),[l,h]),r.useEffect(()=>{h.setOverlayOrder(l,o)},[l,h,o]),r.useEffect(()=>{l.opacity=s,l.color.set(c),a&&!l.frame?l.frame=new W:!a&&l.frame&&(l.frame=null)},[l,s,c,a]),Qe(()=>{a&&f&&l.frame.copy(a).multiply(f.group.matrixWorld)}),yo(l,t)});function yo(i,...e){r.useEffect(()=>{e.forEach(t=>{t&&(t instanceof Function?t(i):t.current=i)})},[i,...e])}function vo(i,e){if(i===e)return!0;if(!i||!e)return i===e;for(const t in i)if(i[t]!==e[t])return!1;for(const t in e)if(i[t]!==e[t])return!1;return!0}function xo(i){const e=r.useRef();return vo(e.current,i)||(e.current=i),e.current}const Qt=new me,Ne=new d;class wn extends an{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new qe(e,3)),this.setAttribute("uv",new qe(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new _e(t,6,1);return this.setAttribute("instanceStart",new re(n,3,0)),this.setAttribute("instanceEnd",new re(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new _e(t,6,1);return this.setAttribute("instanceColorStart",new re(n,3,0)),this.setAttribute("instanceColorEnd",new re(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new cn(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new me);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Qt.setFromBufferAttribute(t),this.boundingBox.union(Qt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new et),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let o=0;for(let s=0,c=e.count;s<c;s++)Ne.fromBufferAttribute(e,s),o=Math.max(o,n.distanceToSquared(Ne)),Ne.fromBufferAttribute(t,s),o=Math.max(o,n.distanceToSquared(Ne));this.boundingSphere.radius=Math.sqrt(o),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}Pe.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Ke(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Ve.line={uniforms:Xe.merge([Pe.common,Pe.fog,Pe.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

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

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

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

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

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
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

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

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class wo extends ln{static get type(){return"LineMaterial"}constructor(e){super({uniforms:Xe.clone(Ve.line.uniforms),vertexShader:Ve.line.vertexShader,fragmentShader:Ve.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const gt=new ie,Yt=new d,Kt=new d,q=new ie,X=new ie,ce=new ie,yt=new d,vt=new W,J=new dn,en=new d,$e=new me,Ge=new et,le=new ie;let de,xe;function tn(i,e,t){return le.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),le.multiplyScalar(1/le.w),le.x=xe/t.width,le.y=xe/t.height,le.applyMatrix4(i.projectionMatrixInverse),le.multiplyScalar(1/le.w),Math.abs(Math.max(le.x,le.y))}function So(i,e){const t=i.matrixWorld,n=i.geometry,o=n.attributes.instanceStart,s=n.attributes.instanceEnd,c=Math.min(n.instanceCount,o.count);for(let a=0,u=c;a<u;a++){J.start.fromBufferAttribute(o,a),J.end.fromBufferAttribute(s,a),J.applyMatrix4(t);const h=new d,f=new d;de.distanceSqToSegment(J.start,J.end,f,h),f.distanceTo(h)<xe*.5&&e.push({point:f,pointOnLine:h,distance:de.origin.distanceTo(f),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}function bo(i,e,t){const n=e.projectionMatrix,s=i.material.resolution,c=i.matrixWorld,a=i.geometry,u=a.attributes.instanceStart,h=a.attributes.instanceEnd,f=Math.min(a.instanceCount,u.count),l=-e.near;de.at(1,ce),ce.w=1,ce.applyMatrix4(e.matrixWorldInverse),ce.applyMatrix4(n),ce.multiplyScalar(1/ce.w),ce.x*=s.x/2,ce.y*=s.y/2,ce.z=0,yt.copy(ce),vt.multiplyMatrices(e.matrixWorldInverse,c);for(let b=0,j=f;b<j;b++){if(q.fromBufferAttribute(u,b),X.fromBufferAttribute(h,b),q.w=1,X.w=1,q.applyMatrix4(vt),X.applyMatrix4(vt),q.z>l&&X.z>l)continue;if(q.z>l){const p=q.z-X.z,y=(q.z-l)/p;q.lerp(X,y)}else if(X.z>l){const p=X.z-q.z,y=(X.z-l)/p;X.lerp(q,y)}q.applyMatrix4(n),X.applyMatrix4(n),q.multiplyScalar(1/q.w),X.multiplyScalar(1/X.w),q.x*=s.x/2,q.y*=s.y/2,X.x*=s.x/2,X.y*=s.y/2,J.start.copy(q),J.start.z=0,J.end.copy(X),J.end.z=0;const A=J.closestPointToPointParameter(yt,!0);J.at(A,en);const R=St.lerp(q.z,X.z,A),D=R>=-1&&R<=1,M=yt.distanceTo(en)<xe*.5;if(D&&M){J.start.fromBufferAttribute(u,b),J.end.fromBufferAttribute(h,b),J.start.applyMatrix4(c),J.end.applyMatrix4(c);const p=new d,y=new d;de.distanceSqToSegment(J.start,J.end,y,p),t.push({point:y,pointOnLine:p,distance:de.origin.distanceTo(y),object:i,face:null,faceIndex:b,uv:null,uv1:null})}}}class Eo extends un{constructor(e=new wn,t=new wo({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,o=new Float32Array(2*t.count);for(let c=0,a=0,u=t.count;c<u;c++,a+=2)Yt.fromBufferAttribute(t,c),Kt.fromBufferAttribute(n,c),o[a]=a===0?0:o[a-1],o[a+1]=o[a]+Yt.distanceTo(Kt);const s=new _e(o,2,1);return e.setAttribute("instanceDistanceStart",new re(s,1,0)),e.setAttribute("instanceDistanceEnd",new re(s,1,1)),this}raycast(e,t){const n=this.material.worldUnits,o=e.camera;o===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;de=e.ray;const c=this.matrixWorld,a=this.geometry,u=this.material;xe=u.linewidth+s,a.boundingSphere===null&&a.computeBoundingSphere(),Ge.copy(a.boundingSphere).applyMatrix4(c);let h;if(n)h=xe*.5;else{const l=Math.max(o.near,Ge.distanceToPoint(de.origin));h=tn(o,l,u.resolution)}if(Ge.radius+=h,de.intersectsSphere(Ge)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),$e.copy(a.boundingBox).applyMatrix4(c);let f;if(n)f=xe*.5;else{const l=Math.max(o.near,$e.distanceToPoint(de.origin));f=tn(o,l,u.resolution)}$e.expandByScalar(f),de.intersectsBox($e)!==!1&&(n?So(this,t):bo(this,o,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(gt),this.material.uniforms.resolution.value.set(gt.z,gt.w))}}const Mo="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json";function Sn(i,e,t=null){t===null&&(t=new Array(100).fill().map(()=>new Array(2)));for(let n=0;n<100;n++){const o=Math.PI*2*n/100,s=Math.sin(o+i),c=Math.cos(o+i),a=Math.sin(10*o)*10*e+75;t[n][0]=s*a,t[n][1]=c*a}return t}const nn={type:"Feature",geometry:{type:"Polygon",coordinates:[Sn(0,1)]}};function Po(){const[i,e]=r.useState(null),[t,n]=r.useState(null),o=r.useMemo(()=>{const a=new d().set(40,40,20),u=new d(-a.x,10,a.y*.25),h=new In(-Math.PI/2),f=new bt().setFromEuler(h);return new W().compose(u,f,a)},[]),s=r.useMemo(()=>{const a=new jn;a.translate(.5,.5,.5);const u=new Fn(a),h=new wn().fromEdgesGeometry(u),f=new Eo(h);return f.material.color.set(16776960),f.material.linewidth=2,f},[]),c=r.useMemo(()=>new W,[]);return r.useEffect(()=>()=>{s.geometry.dispose(),s.material.dispose()},[s]),Qe(a=>{if(t&&s&&(s.scale.x=t.aspectRatio,c.copy(i.matrixWorld).invert()),t){const u=a.clock.getElapsedTime(),h=u*Math.PI*2*.1,f=Math.sin(u*5);Sn(h,f,nn.geometry.coordinates[0]),t.imageSource.redraw()}}),$.jsxs($.Fragment,{children:[$.jsx("color",{attach:"background",args:[2236962]}),$.jsx("group",{"rotation-x":Math.PI/2,children:$.jsxs(Un,{url:Mo,errorTarget:6,children:[$.jsx(xt,{plugin:Dn,fadeDuration:500}),$.jsx(ho,{children:$.jsx(go,{type:Tn,geojson:nn,color:"red",strokeWidth:10,fillStyle:"rgba( 255, 255, 255, 0.25 )",worldToProjection:c,ref:n})}),$.jsx(xt,{plugin:Hn})]})}),$.jsx(Rn,{enableDamping:!0,maxDistance:1e3,minDistance:1,cameraRadius:0}),$.jsx(mo,{scale:150,matrix:o,fixed:!0,children:$.jsx("group",{ref:e,"position-z":-1,children:$.jsx("primitive",{object:s})})})]})}function _o(){return $.jsx(An,{camera:{position:[0,40,35]},style:{width:"100%",height:"100%",position:"absolute",margin:0,left:0,top:0},onContextMenu:i=>{i.preventDefault()},children:$.jsx(Po,{})})}on.createRoot(document.getElementById("root")).render($.jsx(r.StrictMode,{children:$.jsx(_o,{})}));
//# sourceMappingURL=projection-Ca20PMZI.js.map
